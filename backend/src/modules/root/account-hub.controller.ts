import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Request, Response } from 'express';

import {
    Body,
    Controller,
    Get,
    Headers,
    HttpException,
    Post,
    Query,
    Req,
    Res,
    UnauthorizedException,
} from '@nestjs/common';

import { TypedConfigService } from '@common/config/app-config';

const SESSION_COOKIE = 'cheezy_account_session';
const STATE_COOKIE = 'cheezy_oauth_state';
const VERIFIER_COOKIE = 'cheezy_oauth_verifier';
const SHORT_UUID_COOKIE = 'cheezy_short_uuid';
const CSRF_COOKIE = 'cheezy_account_csrf';
const SHORT_UUID_RE = /^[A-Za-z0-9_-]{6,64}$/;

type ContextResponse = { context: string; rw_id: number; expires_in: number };
type ManagedSubscription = {
    id: number;
    rw_id: number;
    label: string | null;
    product_key: string | null;
    source: string;
    is_primary: boolean;
    tariff: string;
    status: string | null;
    days_left: number;
    expire_iso: string | null;
    data_limit_gb: number | null;
    traffic_used_gb: number;
    devices_count: number;
    subscription_url: string | null;
};

@Controller('_account')
export class AccountHubController {
    constructor(private readonly config: TypedConfigService) {}

    private enabled(): boolean {
        return this.config.getOrThrow('CHEEZY_ACCOUNT_ENABLED');
    }

    private portalApi(): string {
        return (this.config.getOrThrow('CHEEZY_PORTAL_API_URL') as string).replace(/\/+$/, '');
    }

    private cookieOptions(maxAge: number) {
        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/',
            maxAge,
        };
    }

    private validShortUuid(value: string | undefined): string {
        if (!value || !SHORT_UUID_RE.test(value)) throw new Error('bad_short_uuid');
        return value;
    }

    private async api<T>(path: string, init?: RequestInit): Promise<T> {
        const response = await fetch(`${this.portalApi()}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...(init?.headers ?? {}),
            },
        });
        const data = (await response.json().catch(() => ({}))) as T & {
            detail?: { code?: string };
        };
        if (!response.ok) {
            throw new HttpException(
                { code: data.detail?.code ?? `portal_${response.status}` },
                response.status,
            );
        }
        return data;
    }

    private context(shortUuid: string): Promise<ContextResponse> {
        return this.api<ContextResponse>('/web/subscription/context', {
            method: 'POST',
            body: JSON.stringify({ short_uuid: shortUuid }),
        });
    }

    private bearer(session: string): HeadersInit {
        return { Authorization: `Bearer ${session}` };
    }

    private requireSessionAndCsrf(
        request: Request,
        csrfHeader: string | undefined,
    ): string {
        const session = request.cookies?.[SESSION_COOKIE] as string | undefined;
        const csrfCookie = request.cookies?.[CSRF_COOKIE] as string | undefined;
        const validCsrf =
            !!csrfHeader &&
            !!csrfCookie &&
            csrfHeader.length === csrfCookie.length &&
            timingSafeEqual(Buffer.from(csrfHeader), Buffer.from(csrfCookie));
        if (!session || !validCsrf) {
            throw new UnauthorizedException({ code: 'unauthorized' });
        }
        return session;
    }

    private renewUrl(subscriptionId: number): string {
        const url = new URL('/dashboard', this.config.getOrThrow('CHEEZY_PORTAL_URL'));
        url.searchParams.set('tab', 'buy');
        url.searchParams.set('subscription_id', String(subscriptionId));
        return url.toString();
    }

    @Get('state')
    async state(
        @Query('short_uuid') shortUuidRaw: string | undefined,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        if (!this.enabled()) return { enabled: false };
        const shortUuid = this.validShortUuid(shortUuidRaw);
        const current = await this.context(shortUuid);
        const session = request.cookies?.[SESSION_COOKIE] as string | undefined;
        const instructionUrl = this.config.get('CHEEZY_INSTRUCTION_URL') ?? null;
        const loginUrl = `/_account/login?short_uuid=${encodeURIComponent(shortUuid)}`;
        if (!session) {
            return { enabled: true, authenticated: false, loginUrl, instructionUrl };
        }

        try {
            const [user, subscriptions] = await Promise.all([
                this.api<{ id: number; email: string | null; has_telegram: boolean }>(
                    '/web/oauth/userinfo',
                    { headers: this.bearer(session) },
                ),
                this.api<{ subscriptions: ManagedSubscription[] }>(
                    '/web/oauth/subscriptions',
                    { headers: this.bearer(session) },
                ),
            ]);
            let csrfToken = request.cookies?.[CSRF_COOKIE] as string | undefined;
            if (!csrfToken) {
                csrfToken = randomBytes(24).toString('base64url');
                response.cookie(CSRF_COOKIE, csrfToken, this.cookieOptions(30 * 60 * 1000));
            }
            return {
                enabled: true,
                authenticated: true,
                user,
                subscriptions: subscriptions.subscriptions.map((item) => ({
                    ...item,
                    renew_url: this.renewUrl(item.id),
                })),
                currentRwId: current.rw_id,
                currentAttached: subscriptions.subscriptions.some(
                    (item) => item.rw_id === current.rw_id,
                ),
                csrfToken,
                instructionUrl,
            };
        } catch (error) {
            if (error instanceof HttpException && error.getStatus() === 401) {
                response.clearCookie(SESSION_COOKIE, { path: '/' });
                return { enabled: true, authenticated: false, loginUrl, instructionUrl };
            }
            throw error;
        }
    }

    @Get('login')
    async login(
        @Query('short_uuid') shortUuidRaw: string | undefined,
        @Res() response: Response,
    ) {
        if (!this.enabled()) return response.status(404).end();
        const shortUuid = this.validShortUuid(shortUuidRaw);
        const current = await this.context(shortUuid);
        const state = randomBytes(24).toString('base64url');
        const verifier = randomBytes(48).toString('base64url');
        const challenge = createHash('sha256').update(verifier).digest('base64url');
        const maxAge = 10 * 60 * 1000;
        response.cookie(STATE_COOKIE, state, this.cookieOptions(maxAge));
        response.cookie(VERIFIER_COOKIE, verifier, this.cookieOptions(maxAge));
        response.cookie(SHORT_UUID_COOKIE, shortUuid, this.cookieOptions(maxAge));

        const authorizeUrl = new URL(
            '/oauth/authorize',
            this.config.getOrThrow('CHEEZY_PORTAL_URL') as string,
        );
        authorizeUrl.searchParams.set('client_id', 'subscription-page');
        authorizeUrl.searchParams.set(
            'redirect_uri',
            this.config.getOrThrow('CHEEZY_OAUTH_REDIRECT_URI') as string,
        );
        authorizeUrl.searchParams.set('response_type', 'code');
        authorizeUrl.searchParams.set('code_challenge', challenge);
        authorizeUrl.searchParams.set('code_challenge_method', 'S256');
        authorizeUrl.searchParams.set('state', state);
        // Fragments never reach portal/reverse-proxy access logs. The portal
        // keeps this value client-side through login/register return_to.
        authorizeUrl.hash = new URLSearchParams({
            subscription_context: current.context,
        }).toString();
        return response.redirect(authorizeUrl.toString());
    }

    @Get('callback')
    async callback(
        @Query('code') code: string | undefined,
        @Query('state') state: string | undefined,
        @Req() request: Request,
        @Res() response: Response,
    ) {
        if (!this.enabled()) return response.status(404).end();
        const expectedState = request.cookies?.[STATE_COOKIE] as string | undefined;
        const verifier = request.cookies?.[VERIFIER_COOKIE] as string | undefined;
        let shortUuid: string;
        try {
            shortUuid = this.validShortUuid(
                request.cookies?.[SHORT_UUID_COOKIE] as string | undefined,
            );
        } catch {
            return response.redirect('/?account_error=invalid_state');
        }
        if (
            !code ||
            !state ||
            !expectedState ||
            !verifier ||
            state.length !== expectedState.length ||
            !timingSafeEqual(Buffer.from(state), Buffer.from(expectedState))
        ) {
            response.clearCookie(STATE_COOKIE, { path: '/' });
            response.clearCookie(VERIFIER_COOKIE, { path: '/' });
            response.clearCookie(SHORT_UUID_COOKIE, { path: '/' });
            return response.redirect(`/${shortUuid}?account_error=invalid_state`);
        }

        try {
            const token = await this.api<{ session_token: string; expires_in: number }>(
                '/web/oauth/token',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        grant_type: 'authorization_code',
                        client_id: 'subscription-page',
                        redirect_uri: this.config.getOrThrow(
                            'CHEEZY_OAUTH_REDIRECT_URI',
                        ),
                        code,
                        code_verifier: verifier,
                    }),
                },
            );
            response.cookie(
                SESSION_COOKIE,
                token.session_token,
                this.cookieOptions(token.expires_in * 1000),
            );
            response.clearCookie(STATE_COOKIE, { path: '/' });
            response.clearCookie(VERIFIER_COOKIE, { path: '/' });
            response.clearCookie(SHORT_UUID_COOKIE, { path: '/' });
            return response.redirect(`/${shortUuid}?account_login=success`);
        } catch {
            response.clearCookie(STATE_COOKIE, { path: '/' });
            response.clearCookie(VERIFIER_COOKIE, { path: '/' });
            response.clearCookie(SHORT_UUID_COOKIE, { path: '/' });
            return response.redirect(`/${shortUuid}?account_error=exchange_failed`);
        }
    }

    @Post('attach')
    async attach(
        @Body() body: { shortUuid?: string; label?: string; makePrimary?: boolean },
        @Headers('x-cheezy-csrf') csrfHeader: string | undefined,
        @Req() request: Request,
    ) {
        if (!this.enabled()) return { enabled: false };
        const shortUuid = this.validShortUuid(body.shortUuid);
        const session = this.requireSessionAndCsrf(request, csrfHeader);
        const current = await this.context(shortUuid);
        return this.api('/web/oauth/subscriptions/attach', {
            method: 'POST',
            headers: this.bearer(session),
            body: JSON.stringify({
                context: current.context,
                label: body.label?.slice(0, 100) || null,
                make_primary: body.makePrimary === true,
            }),
        });
    }

    @Post('transfer')
    async transfer(
        @Body()
        body: {
            shortUuid?: string;
            targetSubscriptionId?: number;
            confirmed?: boolean;
        },
        @Headers('x-cheezy-csrf') csrfHeader: string | undefined,
        @Req() request: Request,
    ) {
        if (!this.enabled()) return { enabled: false };
        const shortUuid = this.validShortUuid(body.shortUuid);
        const session = this.requireSessionAndCsrf(request, csrfHeader);
        if (
            !Number.isInteger(body.targetSubscriptionId) ||
            Number(body.targetSubscriptionId) < 1 ||
            body.confirmed !== true
        ) {
            throw new HttpException({ code: 'confirmation_required' }, 400);
        }
        const current = await this.context(shortUuid);
        return this.api('/web/oauth/subscriptions/transfer', {
            method: 'POST',
            headers: this.bearer(session),
            body: JSON.stringify({
                context: current.context,
                target_subscription_id: body.targetSubscriptionId,
                confirmed: true,
            }),
        });
    }

    @Post('logout')
    logout(
        @Headers('x-cheezy-csrf') csrfHeader: string | undefined,
        @Req() request: Request,
        @Res({ passthrough: true }) response: Response,
    ) {
        this.requireSessionAndCsrf(request, csrfHeader);
        response.clearCookie(SESSION_COOKIE, { path: '/' });
        response.clearCookie(CSRF_COOKIE, { path: '/' });
        return { status: 'ok' };
    }
}
