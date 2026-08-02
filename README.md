## Remnawave Subscription Page

Learn more about Remnawave [here](https://docs.rw/).

### Cheezy account hub (fork extension)

This fork can add a first-party account panel to every subscription page. It
uses a same-origin BFF, PKCE, HttpOnly session cookies and a signed short-lived
subscription context; subscription URLs and portal tokens are not persisted by
the account database.

The extension is opt-in. Configure the matching callback in the portal first,
then set:

```env
CHEEZY_ACCOUNT_ENABLED=true
CHEEZY_PORTAL_API_URL=https://api.example.com/bot/miniapp/api
CHEEZY_PORTAL_URL=https://account.example.com
CHEEZY_OAUTH_REDIRECT_URI=https://sub.example.com/_account/callback
CHEEZY_INSTRUCTION_URL=https://account.example.com/instruction
```

When disabled, the upstream subscription page behavior is unchanged. When
enabled, users can register/sign in, attach the current Remnawave user by its
numeric `rw_id`, keep multiple subscriptions, renew a selected subscription,
or explicitly transfer remaining time to another owned subscription.

# Contributors

Check [open issues](https://github.com/remnawave/subscription-page/issues) to help the progress of this project.

<p align="center">
Thanks to the all contributors who have helped improve Remnawave:
</p>
<p align="center">
<a href="https://github.com/remnawave/subscription-page/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=remnawave/subscription-page" />
</a>
</p>
