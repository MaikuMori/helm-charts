# Changelog

## 1.25.0

- Add `enableServiceLinks` (default `true`, matching the Kubernetes default) to stop the kubelet injecting service discovery environment variables into the pod. Gotenberg reads its configuration from environment variables, so a Service named `api` in the same namespace injects `API_PORT=tcp://<clusterIP>:<port>` and the container exits with `invalid overriding value 'tcp://...' from API_PORT`. Other Service names collide with `API_TIMEOUT`, `API_ROOT_PATH` and the rest of the `API_*`, `CHROMIUM_*`, `LIBREOFFICE_*`, `WEBHOOK_*`, `PDFENGINES_*`, `PROMETHEUS_*` and `LOG_*` families the same way. Set it to `false` to close the whole class.

## 1.24.0

- Bump `gotenberg` version `8.34.0` -> `8.36.0` (via `8.35.0`).
- **Breaking upstream change**: outbound HTTP clients no longer inherit `HTTP_PROXY` and `HTTPS_PROXY` implicitly. Deployments that relied on those variables reaching Chromium, LibreOffice, `downloadFrom` or webhook delivery must now opt in per module via the new `enableEnvironmentProxy` values below.
- Add `api.enableOidcAuth`, `api.oidcIssuer`, `api.oidcAudience` and `api.oidcJwksUrl` (`--api-enable-oidc-auth`, `--api-oidc-issuer`, `--api-oidc-audience`, `--api-oidc-jwks-url`) for OIDC bearer token authentication. Mutually exclusive with `api.enableBasicAuth`; `oidcJwksUrl` is discovered from the issuer's well-known configuration when left empty.
- Add `chromium.enableEnvironmentProxy`, `libreOffice.enableEnvironmentProxy`, `webhook.enableEnvironmentProxy` and `api.downloadFromEnableEnvironmentProxy` to route outbound traffic through the proxy defined by `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` (set via `extraEnv`), credentials included. Use `chromium.enableEnvironmentProxy` instead of `chromium.proxyServer` for authenticated proxies, leaving `proxyServer` and `hostResolverRules` unset.
- Add `chromium.clearStorage` (`--chromium-clear-storage`) to clear Chromium local storage between conversions; session storage is already isolated per conversion.
- Add `pdfEngines.optimizeImagesEngines` (`--pdfengines-optimize-images-engines`) for the new image optimization feature (default `pdfcpu`).
- Upstream security fix: the `Gotenberg-Output-Filename` header is sanitized before reaching archive entry names — `filepath.Base` ignores `\` on Linux, so a crafted header gave a Windows-side Zip Slip on `splitMode` conversions.
- Upstream security fix: `extraHttpHeaders` scope matching now shares a per-conversion time budget and accepts at most 64 headers with a 1024-character `scope`.
- Upstream security fix: Chromium WebSocket handshakes are filtered against the outbound policy, closing connections to hosts the SSRF policy otherwise blocks.
- Upstream features (per-request, no chart config): `/forms/pdfengines/optimize` route and an `optimizeImages` option on the Chromium, LibreOffice, merge and split routes; repeated stamp/watermark fields to apply several in one request; a `selector` field to screenshot a single element; `titleBookmarks` for table-of-contents bookmarks when merging; awaited Promise-returning `waitForExpression`.
- Upstream bug fixes (no chart-level config): LibreOffice returns `500` rather than `400` for server-side failures; `generateDocumentOutline` now enables `generateTaggedPdf` instead of silently doing nothing; the Chromium pinning proxy no longer latches after a start timeout; LibreOffice releases a document after a failed export; landscape single-page fits the page to its content; `.ppsx` and `.ppsm` are accepted; client-cancelled requests are classified `499`; scrolled workbooks render in full for `singlePageSheets`; an unresolvable outbound host returns `403` rather than `500`.
- Bundled Chromium updated to `151.0.7922.71`; `pdfcpu` to `v0.15.0`; `unoconverter` to `v0.4.0`.

## 1.23.0

- Add `lifecycle` to set container lifecycle hooks. A `preStop` hook (e.g. `preStop: {sleep: {seconds: 5}}`) prevents dropped connections during HPA scale-down and rolling updates: an idle Gotenberg closes its listener immediately on SIGTERM, before Service endpoint removal has propagated.

## 1.22.0

- Bump `gotenberg` version `8.32.0` -> `8.34.0` (via `8.33.0`).
- Fix incorrect indentation of `extraEnv` vars in `deployment.yaml` (rendered at 10 spaces instead of 12, causing a YAML parse error).
- **Breaking upstream change**: LibreOffice now blocks content linked from untrusted locations during conversion (`BlockUntrustedRefererLinks`). Documents that pull in external `http(s)://` or local `file:///` linked resources no longer render them. This is unconditional upstream — there is no flag or environment variable to disable it. Embedded content is unaffected.
- Add `logging.stdLevelCase` (`--log-std-level-case`) to set the case of the `level` field in standard-output logs — `lower` (default) or `upper`.
- Add `pdfEngines.facturXEngines` (`--pdfengines-factur-x-engines`) to set the engines and their order for the new Factur-X / ZUGFeRD XMP metadata feature (default `qpdf`).
- Add `pdfEngines.embedMetadataEngines` (`--pdfengines-embed-metadata-engines`) to set the engines and their order for the embed-metadata feature (default `qpdf`). This upstream flag predates 8.32.0 but was previously missing from the chart.
- Upstream security fix: `IsPublicIP` now unwraps IPv4-mapped, 6to4, and Teredo IPv6 addresses and rejects them when the embedded IPv4 is non-public, closing a `denyPrivateIps` bypass.
- Upstream security fix: caller-supplied output filenames (`Gotenberg-Output-Filename` header, `filename` form field) now strip both `/` and `\` path separators.
- Upstream image fix: `ca-certificates` is now installed in the chromium-only image (`gotenberg/gotenberg-chromium`), fixing outbound TLS failures in that variant.
- Upstream bug fixes (no chart-level config): Chromium pinning proxy no longer leaks on a failed start; lifecycle listeners register before navigation to avoid a network-idle stall; supervisor health probes are debounced against transient CDP latency; `downloadFrom` result merging is serialized to avoid a concurrent-map panic; CSV conversions no longer leak the upload's UUID as a page header; webhook async delivery preserves trace context.
- Upstream feature (per-request, no chart config): owner-only encryption/permissions (`ownerPassword`), redesigned Factur-X / ZUGFeRD form fields, and a `deviceScaleFactor` screenshot field.
- Bundled Chromium updated to `149.0.7827.102-1`.

## 1.21.0

- Bump `gotenberg` version `8.31.0` -> `8.32.0`.
- **Breaking upstream change**: 8.31.0's strict SSRF defaults are reverted in 8.32.0 — outbound URL filtering (Chromium, webhooks, download-from) now defaults to permissive again. Operators on internet-facing APIs opt into the strict posture via the new per-module `denyPrivateIps` / `denyPublicIps` flags below. The 1.20.0 changelog note about `--webhook-deny-list` defaulting to block private ranges no longer applies.
- **Breaking upstream change**: `file://` URLs are rejected at `/forms/chromium/convert/url` (route returns HTTP 400). Crafted `file://` sub-resources are scoped to the current request's working directory; `/convert/url` and `/screenshot/url` reject every `file://` sub-resource outright.
- **Breaking upstream change**: `image` / `pdf` stamp and watermark sources now require an uploaded file. Twelve callsites that previously accepted `stampSource=pdf` / `watermarkSource=pdf` with an expression pointing at any path the Gotenberg process could open now return HTTP 400 unless a matching file is uploaded.
- Add `api.downloadFromDenyPrivateIps` / `api.downloadFromDenyPublicIps` (`--api-download-from-deny-private-ips`, `--api-download-from-deny-public-ips`) for IP-class filtering on the download-from feature.
- Add `chromium.denyPrivateIps` / `chromium.denyPublicIps` (`--chromium-deny-private-ips`, `--chromium-deny-public-ips`) for IP-class filtering on Chromium navigations and sub-resources. Skipped when `chromium.proxyServer` or `chromium.hostResolverRules` is set.
- Add `libreOffice.allowList`, `libreOffice.denyList`, `libreOffice.denyPrivateIps`, `libreOffice.denyPublicIps` (`--libreoffice-allow-list`, `--libreoffice-deny-list`, `--libreoffice-deny-private-ips`, `--libreoffice-deny-public-ips`) to filter LibreOffice outbound fetches. OOXML / RTF / ODF can embed external URLs that LibreOffice's libcurl resolves below the Go-side SSRF filter; LibreOffice now routes outbound fetches through an in-process forward proxy on the same `gotenberg.DecideOutbound` path Chromium and webhook delivery use.
- Add `webhook.denyPrivateIps` / `webhook.denyPublicIps` (`--webhook-deny-private-ips`, `--webhook-deny-public-ips`) for IP-class filtering on webhook URLs (success, error, events).
- Upstream bug fix: Chromium chart-rendering regression (charts printed as blank rectangles in print mode) fixed by pinning `chromedp` to `v0.14.2`. Affected 8.29.0 through 8.31.0.
- Upstream bug fix: LibreOffice no longer caches an unrecoverable first-start error; the lazy-start path retries on failure.
- Upstream hardening (no chart-level config): Chromium hardened against DNS rebinding via in-process loopback HTTP/CONNECT proxy that pins the dial to the resolved IP. Webhook async goroutines now recover from panics through the existing error path.

## 1.20.0

- Bump `gotenberg` version `8.29.1` -> `8.31.0`.
- **Breaking upstream change**: SSRF hardening — Gotenberg now resolves outbound URLs (Chromium asset fetches, webhook delivery, download-from) and rejects non-public addresses (loopback, RFC1918, link-local, multicast, IPv6 unique-local, IPv4-mapped IPv6). The dial is pinned to the validated IP to prevent DNS rebinding.
- **Breaking upstream change**: `--webhook-deny-list` now defaults to a regex blocking loopback, RFC1918, link-local, and IPv6 unique-local ranges. Override `webhook.denyList` to call internal hosts.
- **Breaking upstream change**: ExifTool metadata write (`/forms/pdfengines/metadata/write`) now strips control characters and line breaks from payloads and drops `System:`-prefixed tags.
- Mark `webhook.errorAllowList` (`--webhook-error-allow-list`) as deprecated. In Gotenberg 8.31.0+, `webhook.allowList` covers both regular and error webhooks. The old key still works.
- Mark `webhook.errorDenyList` (`--webhook-error-deny-list`) as deprecated. In Gotenberg 8.31.0+, `webhook.denyList` covers both regular and error webhooks. The old key still works.
- Note upstream availability of `chromium` and `libreoffice`-only image variants (`gotenberg/gotenberg:8.31.0-chromium`, `gotenberg/gotenberg:8.31.0-libreoffice`) — set `image.tag` accordingly to use them.
- Note that upstream stopped publishing `thecodingmachine/gotenberg` images. Pull from `gotenberg/gotenberg` instead (the chart already defaults to this).

## 1.19.1

- Bump `gotenberg` version `8.29.0` -> `8.29.1`.

## 1.19.0

- Bump `gotenberg` version `8.27.0` -> `8.29.0`.
- Add support for `--chromium-idle-shutdown-timeout` and `--libreoffice-idle-shutdown-timeout` flags to automatically shut down idle browser/office processes.
- Add support for API telemetry control flags: `--api-disable-root-route-telemetry`, `--api-disable-debug-route-telemetry`, `--api-disable-version-route-telemetry`.
- Add support for new PDF engine flags: `--pdfengines-watermark-engines`, `--pdfengines-stamp-engines`, `--pdfengines-rotate-engines`, `--pdfengines-read-bookmarks-engines`, `--pdfengines-write-bookmarks-engines`.
- Rename `api.traceHeader` to `api.correlationIdHeader` (`--api-correlation-id-header`). The old key still works for backward compatibility.
- Rename `api.disableHealthCheckLogging` to `api.disableHealthCheckRouteTelemetry` (`--api-disable-health-check-route-telemetry`). The old key still works.
- Rename `logging.format` to `logging.stdFormat` (`--log-std-format`). The old key still works.
- Rename `logging.enableGcpFields` to `logging.stdEnableGcpFields` (`--log-std-enable-gcp-fields`). The old key still works.
- Rename `prometheus.disableRouterLogging` to `prometheus.disableRouteTelemetry` (`--prometheus-disable-route-telemetry`). The old key still works.
- **Breaking upstream change**: Health check route telemetry is now disabled by default in Gotenberg 8.29.0 (previously enabled). This applies even without passing the flag.
- Document OpenTelemetry support via standard `OTEL_*` environment variables through `extraEnv`.

## 1.18.0

- Bump `gotenberg` version `8.26.0` -> `8.27.0`.
- Add support for `--chromium-max-concurrency` flag to set the maximum number of concurrent Chromium conversions.
- Update `chromium.restartAfter` default documentation (upstream default changed to 100).

## 1.17.0

- Add `testImage` configuration to customize the test pod image ([#81](https://github.com/MaikuMori/helm-charts/issues/81)).
- Add `service.loadBalancerIP` support for LoadBalancer services ([#82](https://github.com/MaikuMori/helm-charts/issues/82)).

## 1.16.0

- Bump `gotenberg` version `8.25.1` -> `8.26.0`.
- Add support for `--prometheus-metrics-path` flag to set the metrics endpoint path.
- Add experimental Gateway API `HTTPRoute` support (`gateway.enabled`).
- Add `VerticalPodAutoscaler` support (`vpa.create`).
- (CI) Add scheduled workflow to automatically check for new Gotenberg Docker image releases.
- (CI) Update Kubernetes test matrix to v1.35.0, v1.34.3, v1.33.7, v1.32.11, v1.31.14. Update KinD to v0.31.0.

## 1.15.1

- Re-release to fix release assets upload.

## 1.15.0

- Add `initContainers` support for running initialization containers ([@teknatha136](https://github.com/teknatha136)).

## 1.14.0

- Bump `gotenberg` version `8.23.2` -> `8.25.1`.
- Mark `chromium.incognito` flag as deprecated (deprecated in Gotenberg 8.25.0, value is ignored).
- Add support for new PDF Engines flags:
  - `--pdfengines-split-engines` - Set PDF engines for split feature
  - `--pdfengines-flatten-engines` - Set PDF engines for flatten feature
  - `--pdfengines-encrypt-engines` - Set PDF engines for password protection
  - `--pdfengines-embed-engines` - Set PDF engines for file embedding
- Add support for additional configuration flags:
  - `--api-body-limit` - Set request body limit for multipart/form-data
  - `--api-enable-debug-route` - Enable debug endpoint
  - `--api-start-timeout` - Set API startup timeout
  - `--webhook-enable-sync-mode` - Enable synchronous webhook mode
  - `--log-enable-gcp-severity` - Enable GCP severity field mapping
  - `--gotenberg-hide-banner` - Hide startup banner
- Add ability to set `labels` on ingress resource ([@Vovcharaa](https://github.com/Vovcharaa)).
- Add changelog annotations to Chart.yaml for Artifact Hub.
- Fix `HOME` environment variable conflict when set in `extraEnv` - user's explicit setting now takes precedence over automatic behavior.
- (CI) Update GitHub Actions matrix to test against Kubernetes v1.33.1, v1.32.5, v1.31.9, and v1.30.13.

## 1.13.0

- Bump `gotenberg` version `8.19.0` -> `8.23.2`.
- Add `startupProbe` support for deployment.
- Add `existingSecret` option to use an existing secret for basic auth credentials.
- Auto set `HOME` environment variable if `runAsUser` is not the default one.
- Fix issue with `volumes` and TLS secret configuration.
- Minor output rendering fix in HPA template.

## 1.12.0

- Bump `gotenberg` version `8.15.3` -> `8.19.0`.
- Add support for `--log-enable-gcp-fields` flag for improved log field mapping for Cloud Run
- Add support for selecting PDF engines per feature with the following flags:
  - `--pdfengines-merge-engines`
  - `--pdfengines-convert-engines`
  - `--pdfengines-read-metadata-engines`
  - `--pdfengines-write-metadata-engines`
- (CI) Update kind to `v0.27.0` and test against recent K8S versions.

## 1.11.0

- Add possibility to customize `livenessProbe` and `readinessProbe` for deployment ([@v-starodubov](https://github.com/v-starodubov))

## 1.10.0

- Add ability to set `extraMetrics` for HPA ([@anthosz](https://github.com/anthosz))
- Bump `gotenberg` version `8.14.1` -> `8.15.3` ([@anthosz](https://github.com/anthosz))

## 1.9.1

- Fixing 'Additional property enabled is not allowed' when using gotenberg in helm dependency (Thanks to Anthony | [@anthosz](https://github.com/anthosz))
- Bump `gotenberg` version `8.12.0` -> `8.14.1`.
- Publish the chart to OCI registry.

## 1.9.0

- Add ability to create and configure `networkPolicy` (Thanks to Anthony | [@anthosz](https://github.com/anthosz))
- Add [SECURITY.md](../../SECURITY.md).
- Add `testPodAnnotations` (Thanks to Anthony | [@anthosz](https://github.com/anthosz))

## 1.8.0

- Bump `gotenberg` version `8.9.11` -> `8.12.0`.
- Add Helm schema file.
- Update K8S to test against recent K8S versions.
- Add chart signing to CI.

## 1.7.0

- Add ability to customize HorizontalPodAutoscaler behavior (Thanks to Anthony | [@anthosz](https://github.com/anthosz))
- Fix documentation links (Thanks to m² | [@mmoscher](https://github.com/mmoscher))
- Bump `gotenberg` version `8.9.0` -> `8.11.0`.
- Add ability to create `ServiceMonitor` (Thanks to Nazar Vovk | [@Vovcharaa](https://github.com/Vovcharaa))
- Add `allowPrivilegeEscalation: false` to default `securityContext`.
- Add support for the following flags:

  - `--api-download-from-allow-list`
  - `--api-download-from-deny-list`
  - `--api-download-from-max-retry`
  - `--api-disable-download-from`

## 1.6.0

- Bump `gotenberg` version `8.8.1` -> `8.9.0`.
- Add support for `extraEnv` annotations to provide extra environment variables to `gotenberg` container.

## 1.5.1

- Bump `gotenberg` version `8.7.0` -> `8.8.1`.
- Fix [#39](https://github.com/MaikuMori/helm-charts/issues/39) (Thanks to Šimon Woidig | [@SimonWoidig](https://github.com/SimonWoidig))

## 1.5.0

- Bump `gotenberg` version `8.5.1` -> `8.7.0`.
- Add support for the following flags (Thanks to Jonas Geiler | [@jonasgeiler](https://github.com/jonasgeiler)):

  - `--api-tls-cert-file`
  - `--api-tls-key-file`

## 1.4.0

- Add ability to create and configure `PodDisruptionBudget` (Thanks to Aurel Canciu | [@relu](https://github.com/relu))
- Add ability to configure Deployment `topologySpreadConstraints` (Thanks to Aurel Canciu | [@relu](https://github.com/relu))
- Add ability to override Deployment `progressDeadlineSeconds` (Thanks to Aurel Canciu | [@relu](https://github.com/relu))
- Add ability to configure Deployment `strategy` (Thanks to Aurel Canciu | [@relu](https://github.com/relu))
- Add ability to set Service `annotations` (Thanks to Aurel Canciu | [@relu](https://github.com/relu))

## 1.3.0

- Add `securityContext` compatibility with OpenShift platform. (Thanks to Jonas Geiler | [@jonasgeiler](https://github.com/jonasgeiler))
- Bump `gotenberg` version `8.5.0` -> `8.5.1`.

## 1.2.0

- Bump `gotenberg` version `8.1.0` -> `8.5.0`.
- Add new options:

  - `enableBasicAuth`
  - `basicAuthUsername`
  - `basicAuthPassword`

## 1.1.0

- Bump `gotenberg` version `8.0.2` -> `8.1.0`.

- Add new flags:

  - `--chromium-max-queue-size`
  - `--libreoffice-max-queue-size`

## 1.0.1

- Fix typo in `.Values.prometheus.namespace`. (Thanks to Szczepan Rędzioch | [@redzioch](https://github.com/redzioch))
- Bump `gotenberg` version `8.0.1` -> `8.0.2`.

## 1.0.0

- Bump `gotenberg` version `7.10.1` -> `8.0.1`.
- Update configuration options according to upstream changes:
  - Remove `chromium.failedStartsThreshold`.
  - Remove `libreOffice.unoListenerStartTimeout`.
  - Remove `libreOffice.unoListenerRestartThreshold`.
  - Add `chromium.clearCache`.
  - Add `chromium.clearCookies`.
- CI: Fix warning about missing `GITHUB_TOKEN` when setting up Helm.

## 0.7.0

- Bump `gotenberg` version `7.9.2` -> `7.10.1`.
- Add values for the following flags:

  - `--chromium-restart-after`
  - `--chromium-auto-start`
  - `--chromium-start-timeout`
  - `--libreoffice-restart-after`
  - `--libreoffice-auto-start`
  - `--libreoffice-start-timeout`

## 0.6.0

- Add `volumes` and `volumeMounts`. (Thanks to [@pschumacher](https://github.com/pschumacher))

## 0.5.1

- Bump `gotenberg` version `7.9.1` -> `7.9.2`.

## 0.5.0

- Fix [#15](https://github.com/MaikuMori/helm-charts/issues/15) - `HorizontalPodAutoscaler` API version is now `autoscaling/v2` (Thanks to [@tweiss-mdm](https://github.com/tweiss-mdm)).
- Bump `gotenberg` version `7.8.3` -> `7.9.1`.
- Add `logging.fieldsPrefix` value (`--log-fields-prefix`).
- CI: Test install chart on multiple Kubernetes versions (v1.27.3, v1.26.6, v1.25.11, v1.24.15, v1.23.17).
- CI: Test chart upgrades.
- CI: Generate and test as many resources from the chart as possible.

## 0.4.3

- Add `chromium.failedStartsThreshold` value.
- Bump `gotenberg` version `7.8.2` -> `7.8.3`.

## 0.4.2

- Bump `gotenberg` version `7.8.1` -> `7.8.2`.

## 0.4.1

- Bump `gotenberg` version `7.8.0` -> `7.8.1`.

## 0.4.0

- Add `Ingress` resource.

## 0.3.1

- Bump `gotenberg` version `7.7.2` -> `7.8.0`.

## 0.3.0

- Add `podLabels`. (Thanks to Pascal M | [@bagl3y](https://github.com/bagl3y))

## 0.2.2

- Fix `terminationGracePeriodSeconds` set in the wrong place. (Thanks to Szczepan Rędzioch | [@redzioch](https://github.com/redzioch))

## 0.2.1

- Bump app version to `7.2.2`.

## 0.2.0

- Add all documented cli flags as values.

## 0.1.1

- Add README, LICENSE and extra metadata.

## 0.1.0

- Initial release.
