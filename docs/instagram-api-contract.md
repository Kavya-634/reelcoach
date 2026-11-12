# Instagram API contract and verified sources

Reviewed directly against Meta's official documentation on **2026-11-12**. The retrieved references identify **v27.0** as current; the implementation pins this version in `server/config.ts`. These notes are not a claim that a real Meta account has been tested without credentials.

## Login setup

The user selected **Instagram API with Unified Login**, after review of the [migration guide](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/migration-guide), which states: “Newly created apps can't set up the Instagram API with Instagram Login.”

- [Unified Login get started](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started)
- [Authentication and access tokens](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/authentication)
- [Permissions](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/permissions)

Documented authorization endpoint: `https://www.facebook.com/dialog/oauth`, with `client_id`, `config_id`, `redirect_uri`, `response_type=code`, and `prompt=login` to show Instagram and Facebook choices. We additionally use single-use browser-bound `state` as described in [Meta's manual login flow](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/).

Code exchange: server-only `GET https://graph.facebook.com/v27.0/oauth/access_token`, with Meta app ID/secret, code, and the exact registered redirect URI. We receive a Business Integration System User Access Token, **not** a legacy Instagram User token.

We inspect the token through [GET /debug_token](https://developers.facebook.com/docs/graph-api/reference/debug_token/) using the app access credential server-side, verify `app_id`, `is_valid`, required `scopes`, and available expiry fields. API calls use `Authorization: Bearer` as supported by the Graph API, with credentials never returned to the browser. Token exchange/debug parameters necessarily exist only on the server-to-Meta connection; do not enable HTTP request tracing/query capture there.

The application requires `instagram_basic` and `instagram_manage_insights`. The current compatible default configuration also marks `instagram_manage_messages` as required; this is disclosed but **never used**. No message endpoints/subscriptions, publishing, comments moderation, ad accounts, Business Discovery, or scraping are implemented. Remove all optional permissions in Meta's configuration.

## Account identification

With Unified Login, `/me` is the **business integration system user**, not the Instagram profile. We therefore enumerate `GET /me/assigned_instagram_accounts?fields=id,username` and restrict account selection to those authorized IDs. We do not ask the frontend which arbitrary account ID to query.

Profile: `GET /{INSTAGRAM_ACCOUNT_ID}?fields=id,username,name,biography,profile_picture_url,followers_count,media_count`.

Source: [IG User reference](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user). If optional fields are rejected, the server tries those documented fields individually; missing values remain `null`. No fabricated account-type field is requested for Unified Login. An empty authorized-account list is explained as “no eligible professional account shared,” with personal-to-professional setup instructions, not treated as proof of a personal account.

## Reel listing and ownership

`GET /{INSTAGRAM_ACCOUNT_ID}/media` with documented fields:

```text
id,media_type,permalink,thumbnail_url,timestamp,owner,like_count,comments_count
```

Source: [IG Media reference](https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media).

**Documentation caveat:** the retrieved field table labels `caption` and `media_product_type` as “Available for Instagram API with Facebook Login only.” Unified Login is listed separately. We do not assume that label includes Unified Login. Those fields are intentionally not requested. Reels are conservatively identified as `VIDEO` media with a `/reel/` or `/reels/` permalink returned by Meta. Other/unclassified video posts are not silently treated as reels. Titles use the publication date, not an invented caption.

The reference says `owner` is returned only when the requester created the media. Before any detailed insights request, we require `owner.id === selected authorized Instagram account ID`. Missing/unverifiable ownership fails closed. Co-authoring somebody else's reel does not qualify as ownership.

A pasted URL is validated for HTTPS, an exact Instagram host, and a Reel path. The URL is **never fetched**. The server searches only the selected account's own media pages and compares canonical shortcodes. The lookup reads at most five 10-post pages per request; if more remain, it returns a signed continuation cursor, not a false “not owned” conclusion. The UI lets the user continue searching older posts. A completed search without a match or an explicit different owner yields the required message:

> Instagram only shares detailed numbers for reels on the account you logged in with.

Cursor pagination never follows or returns Meta's `paging.next` URL (which may contain a token). The server extracts only the cursor and signs continuation state bound to the session, selected account, search target, and expiry.

## Media insights

Endpoint: `GET /{INSTAGRAM_MEDIA_ID}/insights?metric=…`

Source: [Instagram Media Insights reference](https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media/insights).

| UI label           | Documented API metric     | Behavior                                                 |
| ------------------ | ------------------------- | -------------------------------------------------------- |
| Views              | `views`                   | Instagram plays; Meta marks it “in development”          |
| Reach              | `reach`                   | Unique Instagram users; estimated                        |
| Likes              | `likes`                   | Fallback to documented `like_count` field if omitted     |
| Comments           | `comments`                | Fallback to documented `comments_count` field if omitted |
| Shares             | `shares`                  | Null if unavailable; zero remains a real zero            |
| Saves              | `saved`                   | Media insight is **saved**, not account-level **saves**  |
| Average watch time | `ig_reels_avg_watch_time` | Null if unavailable; see unit caveat below               |

No deprecated `plays` or `impressions` fallback, no guessed aliases, and no crossposted/paid totals are mixed into these values. The current reference marks `total_views`, `total_likes`, and `total_comments` as Facebook-Login-only; they are not requested. Media insights return lifetime values; they are not reconstructed as a 30-day series.

Unsupported combined metric requests are retried per documented metric, so one unavailable metric does not erase others. Missing/empty insight values become `null` and render **Not available**, never zero. Broad permission failures prompt reconnection; rate limits/outages show a friendly retry-later message.

### Watch-time unit caveat

The retrieved official table defines `ig_reels_avg_watch_time` as “The average amount of time spent playing the reel,” **without specifying seconds or milliseconds**. We do not infer units from magnitude or a third-party article.

If Meta's actual metric `description` explicitly specifies milliseconds or seconds, the DTO records that unit and the UI can display seconds accordingly. Otherwise the UI shows the returned number as **“(API value)”** with an explanation that its unit is unspecified. The raw value remains available without an undocumented conversion. Duration/completion rate/retention curves are not fabricated.

## Account insights

Sources: [Account Insights reference](https://developers.facebook.com/documentation/instagram-platform/api-reference/instagram-user/insights), [Insights guide and limitations](https://developers.facebook.com/documentation/instagram-platform/insights).

For the last 30 complete UTC days:

- `GET /{ACCOUNT_ID}/insights?metric=views,reach,total_interactions&period=day&metric_type=total_value&since=…&until=…`.
- Separate `reach` request using `metric_type=time_series` for daily reach.
- The current table supports `views` as `total_value`, not a daily time series. We do not invent a daily views/engagement chart or previous-period growth. Demo charts remain exactly fixture-driven and independent.
- Totals cover all account content and may include ads, as Meta documents. They are not presented as sums of the loaded reels. Daily reach is not summed to claim unique monthly account reach.
- Some metrics require minimum activity/follower thresholds; unavailable data returns an empty dataset. The app displays missing values honestly.

## Error handling and security

Source: [Graph API error handling](https://developers.facebook.com/docs/graph-api/guides/error-handling/).

- `190` / `102`: session/access-token failure → clear app session and offer reconnect.
- `10` / `200–299`: permission issue → explain access requirements, offer reconnect.
- `4`, `17`, `32`, `613`, transient flags, `429`, and upstream `5xx`: retry-later message; no raw Meta errors, request URLs, headers, or tokens sent to the UI.
- Wrong/expired/replayed OAuth state: reject before token exchange.
- Mutations require exact configured Origin and CSRF protection. Disconnect additionally requires a non-simple custom action header and intentionally works after client/session expiry; no cross-origin access is enabled.
- API output is mapped into allowlisted DTOs and checked against known secrets. Requests are bounded, timed out, concurrency-limited, and cancelled when sessions end.
- No provider data is retained beyond a request except the temporary authentication identifiers/token needed for the RAM session.

See [setup and operational requirements](instagram-setup.md) for deployment, log redaction, restarts, and the single-process constraint.
