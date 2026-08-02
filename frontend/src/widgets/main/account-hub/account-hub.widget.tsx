import {
    Alert,
    Badge,
    Button,
    Card,
    Checkbox,
    Group,
    Loader,
    Modal,
    Select,
    Stack,
    Text,
    Title
} from '@mantine/core'
import {
    IconArrowRight,
    IconBook2,
    IconCheck,
    IconExternalLink,
    IconLogin,
    IconRefresh,
    IconUserCircle
} from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useCurrentLang } from '@entities/app-config-store'

import styles from './account-hub.module.css'

type ManagedSubscription = {
    id: number
    rw_id: number
    label: string | null
    source: string
    is_primary: boolean
    tariff: string
    status: string | null
    days_left: number
    devices_count: number
    renew_url: string
}

type HubState = {
    enabled: boolean
    authenticated?: boolean
    loginUrl?: string
    instructionUrl?: string | null
    csrfToken?: string
    currentRwId?: number
    currentAttached?: boolean
    user?: { email: string | null; has_telegram: boolean }
    subscriptions?: ManagedSubscription[]
}

const copy = {
    ru: {
        eyebrow: 'АККАУНТ И ПОДПИСКА',
        title: 'Управляйте этой подпиской',
        guest: 'Войдите или зарегистрируйтесь, чтобы сохранить подписку в аккаунте, синхронизировать её с CheezyVPN и продлевать именно этот заказ, а также управлять устройствами в подписке',
        login: 'Войти или зарегистрироваться',
        guide: 'Подробная инструкция',
        route: ['ссылка', 'аккаунт', 'профиль', 'подключено'],
        linked: 'Эта подписка уже в аккаунте',
        add: 'Добавить отдельным профилем',
        addHint: 'Рекомендуемый вариант: срок, трафик и устройства останутся отдельными.',
        transfer: 'Перенести остаток срока',
        transferHint: 'Дополнительный вариант для объединения с существующим профилем.',
        transferTitle: 'Перенос остатка срока',
        transferTarget: 'Куда перенести дни',
        transferConfirm: 'Я понимаю, что текущая подписка будет отключена после переноса.',
        transferSubmit: 'Перенести и отключить текущую',
        transferDone: (days: number) => `Перенос завершён: добавлено ${days} дн.`,
        transferUnavailable: 'Сначала добавьте в аккаунт другой профиль.',
        cancel: 'Отмена',
        profiles: 'Профили аккаунта',
        primary: 'Основной',
        renew: 'Личный кабинет и продление',
        days: 'дн.',
        devices: 'устройств',
        added: 'Подписка добавлена. Обновите профили в CheezyVPN.',
        failed: 'Не удалось выполнить действие. Обновите страницу или обратитесь в поддержку.',
        signOut: 'Выйти из аккаунта'
    },
    en: {
        eyebrow: 'ACCOUNT & SUBSCRIPTION',
        title: 'Manage this subscription',
        guest: 'Sign in or create an account to save this subscription, synchronize it with CheezyVPN, and renew this exact order, as well as manage devices on the subscription',
        login: 'Sign in or create account',
        guide: 'Detailed connection guide',
        route: ['link', 'account', 'profile', 'connected'],
        linked: 'This subscription is already in your account',
        add: 'Add as a separate profile',
        addHint: 'Recommended: its expiry, traffic and devices remain independent.',
        transfer: 'Transfer remaining time',
        transferHint: 'An optional way to consolidate time into an existing profile.',
        transferTitle: 'Transfer remaining time',
        transferTarget: 'Transfer days to',
        transferConfirm: 'I understand that this subscription will be disabled after transfer.',
        transferSubmit: 'Transfer and disable current',
        transferDone: (days: number) => `Transfer complete: ${days} days added.`,
        transferUnavailable: 'Add another profile to your account first.',
        cancel: 'Cancel',
        profiles: 'Account profiles',
        primary: 'Primary',
        renew: 'Account and renewal',
        days: 'days',
        devices: 'devices',
        added: 'Subscription added. Refresh profiles in CheezyVPN.',
        failed: 'The action failed. Refresh the page or contact support.',
        signOut: 'Sign out'
    }
} as const

function currentShortUuid(): string {
    const parts = window.location.pathname.split('/').filter(Boolean)
    return parts.at(-1) ?? ''
}

export const AccountHubWidget = () => {
    const currentLang = useCurrentLang()
    const lang = currentLang === 'ru' ? 'ru' : 'en'
    const t = copy[lang]
    const shortUuid = useMemo(() => currentShortUuid(), [])
    const [state, setState] = useState<HubState | null>(null)
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
    const [transferOpen, setTransferOpen] = useState(false)
    const [targetId, setTargetId] = useState<string | null>(null)
    const [transferConfirmed, setTransferConfirmed] = useState(false)

    const reload = useCallback(async () => {
        const response = await fetch(`/_account/state?short_uuid=${encodeURIComponent(shortUuid)}`)
        setState((await response.json()) as HubState)
    }, [shortUuid])

    useEffect(() => {
        void reload().catch(() => setState({ enabled: false }))
    }, [reload])

    const attach = async () => {
        if (!state?.csrfToken) return
        setBusy(true)
        setNotice(null)
        try {
            const response = await fetch('/_account/attach', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cheezy-CSRF': state.csrfToken
                },
                body: JSON.stringify({ shortUuid, makePrimary: false })
            })
            if (!response.ok) throw new Error('attach_failed')
            setNotice({ ok: true, text: t.added })
            await reload()
        } catch {
            setNotice({ ok: false, text: t.failed })
        } finally {
            setBusy(false)
        }
    }

    const logout = async () => {
        if (!state?.csrfToken) return
        await fetch('/_account/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'X-Cheezy-CSRF': state.csrfToken }
        })
        await reload()
    }

    const transferTargets = (state?.subscriptions ?? []).filter(
        (item) => item.rw_id !== state?.currentRwId
    )
    const transferOptions = transferTargets.map((item) => ({
        value: String(item.id),
        label: `${item.label || item.tariff} · ${item.days_left} ${t.days}`
    }))

    const transfer = async () => {
        if (!state?.csrfToken || !targetId || !transferConfirmed) return
        setBusy(true)
        setNotice(null)
        try {
            const response = await fetch('/_account/transfer', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cheezy-CSRF': state.csrfToken
                },
                body: JSON.stringify({
                    shortUuid,
                    targetSubscriptionId: Number(targetId),
                    confirmed: true
                })
            })
            if (!response.ok) throw new Error('transfer_failed')
            const result = (await response.json()) as { days_transferred?: number }
            setNotice({ ok: true, text: t.transferDone(result.days_transferred ?? 0) })
            setTransferOpen(false)
            setTargetId(null)
            setTransferConfirmed(false)
            await reload()
        } catch {
            setNotice({ ok: false, text: t.failed })
        } finally {
            setBusy(false)
        }
    }

    if (state === null) {
        return <Card className={styles.hub} p="lg"><Loader color="gray" size="sm" /></Card>
    }
    if (!state.enabled) return null

    return (
        <Card className={styles.hub} p={{ base: 'lg', sm: 'xl' }} radius="lg">
            <Stack gap="lg">
                <div>
                    <Text c="dimmed" ff="monospace" fz="xs" fw={700} lts="0.14em">
                        {t.eyebrow}
                    </Text>
                    <Title mt={6} order={3}>{t.title}</Title>
                    <div className={styles.route} style={{ marginTop: '0.8rem' }}>
                        {t.route.map((item, index) => (
                            <Group gap="xs" key={item} wrap="nowrap">
                                <strong>{item}</strong>
                                {index < t.route.length - 1 && <IconArrowRight size={13} />}
                            </Group>
                        ))}
                    </div>
                </div>

                {!state.authenticated ? (
                    <Stack gap="md">
                        <Text c="dimmed" lh={1.6}>{t.guest}</Text>
                        <Group>
                            <Button
                                color="black"
                                component="a"
                                href={state.loginUrl}
                                leftSection={<IconLogin size={17} />}
                                variant="white"
                            >
                                {t.login}
                            </Button>
                            {state.instructionUrl && (
                                <Button
                                    color="gray"
                                    component="a"
                                    href={state.instructionUrl}
                                    leftSection={<IconBook2 size={17} />}
                                    rel="noreferrer"
                                    target="_blank"
                                    variant="subtle"
                                >
                                    {t.guide}
                                </Button>
                            )}
                        </Group>
                    </Stack>
                ) : (
                    <Stack gap="lg">
                        <Group justify="space-between">
                            <Group gap="xs">
                                <IconUserCircle color="var(--mantine-color-dark-1)" size={20} />
                                <Text fz="sm">{state.user?.email ?? 'Telegram'}</Text>
                            </Group>
                            <Button color="gray" onClick={() => void logout()} size="compact-sm" variant="subtle">
                                {t.signOut}
                            </Button>
                        </Group>

                        {notice && (
                            <Alert color={notice.ok ? 'green' : 'red'} icon={notice.ok ? <IconCheck /> : undefined}>
                                {notice.text}
                            </Alert>
                        )}

                        {state.currentAttached ? (
                            <Alert color="green" icon={<IconCheck size={18} />}>{t.linked}</Alert>
                        ) : (
                            <Stack gap="xs">
                                <Button
                                    color="black"
                                    leftSection={busy ? <Loader color="dark" size="xs" /> : <IconRefresh size={17} />}
                                    loading={busy}
                                    onClick={() => void attach()}
                                    variant="white"
                                >
                                    {t.add}
                                </Button>
                                <Text c="dimmed" fz="xs">{t.addHint}</Text>
                                <Button
                                    color="gray"
                                    disabled={transferTargets.length === 0}
                                    onClick={() => setTransferOpen(true)}
                                    variant="subtle"
                                >
                                    {t.transfer}
                                </Button>
                                <Text c="dimmed" fz="xs">{t.transferHint}</Text>
                                {transferTargets.length === 0 && (
                                    <Text c="dimmed" fz="xs">{t.transferUnavailable}</Text>
                                )}
                            </Stack>
                        )}

                        {!!state.subscriptions?.length && (
                            <div>
                                <Text fw={600} mb="xs" size="sm">{t.profiles}</Text>
                                {state.subscriptions.map((item) => (
                                    <div className={styles.profile} key={item.id}>
                                        <div>
                                            <Group gap="xs">
                                                <Text fw={600} size="sm">{item.label || item.tariff}</Text>
                                                {item.is_primary && <Badge color="gray" size="xs">{t.primary}</Badge>}
                                            </Group>
                                            <Text c="dimmed" fz="xs" mt={3}>
                                                {item.days_left} {t.days} · {item.devices_count} {t.devices}
                                            </Text>
                                        </div>
                                        <Group gap="xs" wrap="nowrap">
                                            <Button
                                                color="gray"
                                                component="a"
                                                href={item.renew_url}
                                                size="compact-xs"
                                                variant="subtle"
                                            >
                                                {t.renew}
                                            </Button>
                                            {item.rw_id === state.currentRwId && (
                                                <IconExternalLink color="var(--mantine-color-dark-1)" size={17} />
                                            )}
                                        </Group>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Stack>
                )}
            </Stack>
            <Modal
                centered
                onClose={() => !busy && setTransferOpen(false)}
                opened={transferOpen}
                title={t.transferTitle}
            >
                <Stack gap="md">
                    <Text c="dimmed" fz="sm">{t.transferHint}</Text>
                    <Select
                        data={transferOptions}
                        label={t.transferTarget}
                        onChange={setTargetId}
                        value={targetId}
                    />
                    <Checkbox
                        checked={transferConfirmed}
                        label={t.transferConfirm}
                        onChange={(event) => setTransferConfirmed(event.currentTarget.checked)}
                    />
                    <Group justify="flex-end">
                        <Button color="gray" disabled={busy} onClick={() => setTransferOpen(false)} variant="subtle">
                            {t.cancel}
                        </Button>
                        <Button
                            color="red"
                            disabled={!targetId || !transferConfirmed}
                            loading={busy}
                            onClick={() => void transfer()}
                        >
                            {t.transferSubmit}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Card>
    )
}
