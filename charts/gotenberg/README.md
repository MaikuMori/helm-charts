# Gotenberg

[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/gotenberg)](https://artifacthub.io/packages/helm/maikumori/gotenberg)
![Version: 2.0.0](https://img.shields.io/badge/Version-2.0.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 9.6.0](https://img.shields.io/badge/AppVersion-9.6.0-informational?style=flat-square)

This is a HELM chart for Gotenberg.

Gotenberg provides a developer-friendly API to interact with powerful tools like Chromium and LibreOffice for converting numerous document formats (HTML, Markdown, Word, Excel, etc.) into PDF files, and more!

Upstream links:

- [Homepage](https://gotenberg.dev/)
- [Documentation](https://gotenberg.dev/docs/about)
- [GitHub](https://github.com/gotenberg/gotenberg)

## OCI Repositories

The recommended way to install these charts is via OCI and the `helm search hub maikumori` command should list the available charts.

## Non-OCI Repository

If you don't want to use the OCI repositories you can add the `maikumori` repository as follows.

```console
helm repo add maikumori https://maikumori.github.io/helm-charts/
helm repo update
```

## Installing the Chart

To install the chart with the release name `my-release`:

```console
helm install my-release --namespace gotenberg oci://ghcr.io/maikumori/helm-charts/gotenberg
```

If you added the non-OCI repository above, you can also use the `maikumori/gotenberg` shorthand in place of the OCI URL in any of the commands below.

## Verifying the Chart

Each release is signed twice: with GPG as a Helm [provenance file](https://helm.sh/docs/topics/provenance/), and with keyless [cosign](https://github.com/sigstore/cosign) from this repository's release workflow.

To verify the GPG signature, fetch the signing key (fingerprint `F29F20C1CBD1FDE9566828E0641F7D67BC03019B`) into a keyring file and pass it to Helm:

```console
curl -sSfL https://raw.githubusercontent.com/MaikuMori/helm-charts/master/pubkey.asc | gpg --dearmor > maikumori.gpg
helm pull oci://ghcr.io/maikumori/helm-charts/gotenberg --version <version> --verify --keyring maikumori.gpg
```

`helm install` and `helm upgrade` accept the same `--verify --keyring maikumori.gpg` flags.

The cosign signatures need [cosign](https://github.com/sigstore/cosign) 3.0 or newer and exist for chart 1.28.0 and later. To verify the OCI chart:

```console
cosign verify ghcr.io/maikumori/helm-charts/gotenberg:<version> \
  --certificate-identity https://github.com/MaikuMori/helm-charts/.github/workflows/release.yml@refs/heads/master \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

Charts from the [GitHub releases](https://github.com/MaikuMori/helm-charts/releases) come with a `.sigstore.json` bundle:

```console
cosign verify-blob gotenberg-<version>.tgz --bundle gotenberg-<version>.tgz.sigstore.json \
  --certificate-identity https://github.com/MaikuMori/helm-charts/.github/workflows/release.yml@refs/heads/master \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

From chart 1.29.0, releases also carry [GitHub artifact attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations) recording the release workflow and source commit. Verify them with the GitHub CLI:

```console
gh attestation verify oci://ghcr.io/maikumori/helm-charts/gotenberg:<version> --repo MaikuMori/helm-charts \
  --signer-workflow MaikuMori/helm-charts/.github/workflows/release.yml
gh attestation verify gotenberg-<version>.tgz --repo MaikuMori/helm-charts \
  --signer-workflow MaikuMori/helm-charts/.github/workflows/release.yml
```

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```console
helm delete my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Upgrading Chart

```console
helm upgrade my-release oci://ghcr.io/maikumori/helm-charts/gotenberg --install
```

### Upgrading to 2.0.0

Chart 2.0.0 moves to Gotenberg 9, which changes routes, form fields, flags and metrics. Read Gotenberg's [upgrade guide](https://gotenberg.dev/docs/getting-started/upgrade) and the chart's [CHANGELOG](https://github.com/MaikuMori/helm-charts/blob/master/charts/gotenberg/CHANGELOG.md#200), which maps every 1.x value that changed. Migrate your values file with that table, then upgrade with it and `--reset-values`: without it, Helm can reuse the release's 1.x values, which the values schema rejects.

```console
helm upgrade my-release oci://ghcr.io/maikumori/helm-charts/gotenberg --version 2.0.0 --reset-values -f values.yaml
```

- Drop any `image.tag` or `image.digest` that pins Gotenberg 8, and rebuild custom images based on `gotenberg/gotenberg:8`.
- If your values file is a copy of the 1.x defaults, delete the four `api.disable*RouteTelemetry: false` entries, which now turn telemetry on for the health check, root, debug and version routes, and `chromium.maxConcurrency: 0`, which Gotenberg 9 refuses.
- During the rollout, Gotenberg 8 and 9 pods serve behind one Service, and clients of the removed routes and fields fail on the 9 pods. Migrate the clients first, set `strategy.type: Recreate` for the upgrade, or install 2.0.0 as a separate release and switch clients over.

To stay on Gotenberg 8, keep chart 1.31.0, which runs 8.40.0, the final Gotenberg 8 release.

### Using a Newer Gotenberg Version

Chart releases are typically published when new features or breaking changes are added to Gotenberg that require chart modifications. However, you can use any Gotenberg 9 version by overriding the `image.tag` value.

To use a specific version of Gotenberg:

```console
helm upgrade --install my-release oci://ghcr.io/maikumori/helm-charts/gotenberg --set image.tag="9.6.0"
```

Or with `--rollback-on-failure` (`--atomic` on Helm 3) for automatic rollback on failure:

```console
helm upgrade --install --rollback-on-failure my-release oci://ghcr.io/maikumori/helm-charts/gotenberg --set image.tag="9.6.0"
```

This allows you to stay current with Gotenberg releases without waiting for a new chart version, as there are typically no breaking changes within a major version. A newer flag the chart maps needs a Gotenberg version that has it.

### Pinning Images by Digest

Tags can be moved to point at a different image. To pull exactly the image you reviewed, set its digest along with the tag:

```console
helm upgrade --install my-release oci://ghcr.io/maikumori/helm-charts/gotenberg \
  --set image.tag="9.6.0" --set image.digest="sha256:<digest>"
```

`docker buildx imagetools inspect gotenberg/gotenberg:9.6.0` prints the digest. The `helm test` image is pinned by digest by default (`testImage.digest`).

## Resources

The chart sets no resource requests or limits by default. Gotenberg recommends at least 512Mi of memory and 0.2 CPU; Chromium and LibreOffice use more under load, so leave headroom in the memory limit. Chromium, LibreOffice and Gotenberg itself, which does the PDF processing, share it. `chromium.maxMemory` and `libreOffice.maxMemory` fail the conversion that runs over its budget and restart that engine, instead of letting the container get OOM-killed. `GOMEMLIMIT`, set through `extraEnv`, makes Gotenberg's Go runtime collect garbage before it reaches its share; it's a soft limit, not a cap. Keep the three together under the container's limit:

```yaml
resources:
  requests:
    cpu: 200m
    memory: 512Mi
  limits:
    memory: 3Gi
chromium:
  maxMemory: 800MB
libreOffice:
  maxMemory: 900MB
extraEnv:
  - name: GOMEMLIMIT
    value: 1000MiB
```

See [Limits](https://gotenberg.dev/docs/operate/limits) for these and the PDF module's limits.

## Hardening Example

Outside OpenShift, the chart's default security contexts already meet the Pod Security `restricted` level; on OpenShift, the SCC decides. Containers and volumes you add, such as `initContainers`, have to meet it too. Gotenberg's own defaults are permissive about outbound requests: it assumes it runs on a trusted network, so Chromium, LibreOffice, `downloadFrom`, webhooks and the PDF timestamp authority can reach internal addresses such as the cloud metadata service.

The values below are an example to start from if callers or their documents aren't trusted, not a complete or guaranteed setup: review them against your cluster and threat model, and adjust the NetworkPolicy to your clients, DNS and network ranges. They deny private addresses and limit the pod's network access. CI installs them to catch regressions, checking that documents still convert, that Chromium and the PDF `timestamp` stage refuse a private address, and that the NetworkPolicy allows DNS and public HTTPS but not another release's Service:

```yaml
# Example hardening for untrusted callers: a starting point to adjust to your
# cluster, not a complete setup.

# Reject outbound requests to private, loopback and link-local addresses from
# every module that fetches URLs.
api:
  downloadFromDenyPrivateIps: true
chromium:
  denyPrivateIps: true
libreOffice:
  denyPrivateIps: true
pdf:
  denyPrivateIps: true
webhook:
  denyPrivateIps: true

networkPolicy:
  enabled: true
  # Only accept API calls from pods in the release's namespace. Replace the
  # rule with a selector for your clients. 3000 is api.port.
  ingress:
    - from:
        - podSelector: {}
      ports:
        - port: 3000
  # Only allow DNS, and HTTP(S) outside the private ranges below. Adapt the
  # ranges to your cluster and check that your CNI enforces NetworkPolicies;
  # this alone doesn't guarantee the cluster network is unreachable. Some
  # CNIs don't apply NetworkPolicies to the node's own addresses, which can
  # include the Kubernetes API (as on MicroShift). IPv4
  # only: on dual-stack clusters, add ::/0 excepting fc00::/7 and fe80::/10.
  # DNS pods are kube-dns, or openshift-dns listening on 5353 on OpenShift
  # (not tested with OVN-Kubernetes).
  egress:
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: openshift-dns
          podSelector:
            matchLabels:
              dns.operator.openshift.io/daemonset-dns: default
      ports:
        - port: 5353
          protocol: UDP
        - port: 5353
          protocol: TCP
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
              - 169.254.0.0/16
              - 100.64.0.0/10
      ports:
        - port: 80
        - port: 443
```

Also require authentication on the API, with `api.basicAuth.enabled` or `api.enableOidcAuth`, and disable what you don't use, such as `chromium.disableRoutes`, `libreOffice.disableRoutes`, or `pdf.disableRoutes` with `pdf.disableStages` for all PDF processing. See [Outbound URL Filtering](https://gotenberg.dev/docs/outbound-url-filtering) for the allow and deny lists.

## OpenShift

OpenShift support is best effort. When the cluster serves the `security.openshift.io/v1` API, the default security context leaves the user, non-root check and seccomp profile to the SCC. CI installs the chart on [MicroShift](https://github.com/microshift-io/microshift) built from OKD, with the Kindnet CNI rather than OVN-Kubernetes, under the `restricted-v2` and `anyuid` SCCs; it isn't tested on OpenShift Container Platform. Detection needs Helm to see the cluster's APIs: when rendering without cluster access, such as `helm template`, pass `--api-versions security.openshift.io/v1`. Issues and pull requests from OpenShift users are welcome.

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` |  |
| api.archiveMaxEntries | int | `nil` | Set the maximum number of entries of a zip archive sent in the `archives` form field. Must be positive. Leave unset for the upstream default (10000). |
| api.archiveMaxRatio | int | `nil` | Set how many times its own size a zip archive sent in the `archives` form field may unpack to. Must be positive. Leave unset for the upstream default (100). |
| api.basicAuth.enabled | bool | `false` | Enable basic authentication, with credentials from `existingSecret`, or `username` and `password`. Mutually exclusive with `enableOidcAuth`. |
| api.basicAuth.existingSecret | string | `""` | Name of an existing secret holding the credentials |
| api.basicAuth.password | string | `nil` | Set the password (ignored if existingSecret is set) |
| api.basicAuth.passwordKey | string | `""` | Key in `existingSecret` for the password (default: password) |
| api.basicAuth.username | string | `nil` | Set the username (ignored if existingSecret is set) |
| api.basicAuth.usernameKey | string | `""` | Key in `existingSecret` for the username (default: username) |
| api.bodyLimit | string | `""` | Set the request body limit for multipart/form-data (e.g., "100MB") |
| api.correlationIdHeader | string | `""` | Set the header name to use for identifying requests (default "Gotenberg-Trace") |
| api.disableDebugRouteTelemetry | bool | `nil` | Disable telemetry on the debug route. Leave unset for the upstream default (true). |
| api.disableDownloadFrom | bool | `false` | Disable the download from feature |
| api.disableHealthCheckRouteTelemetry | bool | `nil` | Disable health check route telemetry. Leave unset for the upstream default (true). |
| api.disableRootRouteTelemetry | bool | `nil` | Disable telemetry on the root route. Leave unset for the upstream default (true). |
| api.disableVersionRouteTelemetry | bool | `nil` | Disable telemetry on the version route. Leave unset for the upstream default (true). |
| api.downloadFromAllowList | list | `[]` | List of regular expressions for the allowed `downloadFrom` URLs. Terminate the host, e.g. `^https://files\.example\.com/`: a match skips the IP-class checks. |
| api.downloadFromDenyList | list | `[]` | List of regular expressions for the denied `downloadFrom` URLs |
| api.downloadFromDenyPrivateIps | bool | `false` | Reject `downloadFrom` URLs resolving to a non-public IP (loopback, RFC1918, link-local, IPv6 unique-local). A URL matching `downloadFromAllowList` skips the IP-class check; a URL matching `downloadFromDenyList` is always rejected. |
| api.downloadFromDenyPublicIps | bool | `false` | Reject `downloadFrom` URLs resolving to a public IP. Setting both `downloadFromDenyPrivateIps` and `downloadFromDenyPublicIps` to true rejects every URL unless the allow-list matches. |
| api.downloadFromEnableEnvironmentProxy | bool | `false` | Route `downloadFrom` fetches through the proxy defined by the standard `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY` variables (set them via `extraEnv`), credentials included. |
| api.downloadFromMaxConcurrency | int | `nil` | Set the maximum number of concurrent fetches per request for the download from feature. Leave unset for the upstream default (10); set to 0 for no limit. |
| api.downloadFromMaxEntries | int | `nil` | Set the maximum number of entries in the `downloadFrom` array. Leave unset or set to 0 for no limit. |
| api.downloadFromMaxRetry | int | `nil` | Set the maximum number of retries for the download from feature. Leave unset for the upstream default (4). |
| api.enableDebugRoute | bool | `false` | Enable debug route for debugging purposes |
| api.enableOidcAuth | bool | `false` | Enable OIDC bearer token authentication. Mutually exclusive with `basicAuth.enabled`. |
| api.oidcAudience | string | `""` | Set the expected OIDC audience - the token `aud` claim must contain it. |
| api.oidcIssuer | string | `""` | Set the OIDC issuer URL, e.g. `https://tenant.example.com/` - the token `iss` claim must match. |
| api.oidcJwksUrl | string | `""` | Set the OIDC JWKS URL. Discovered from the issuer's well-known configuration when empty. |
| api.port | int | `3000` | Set the port on which the API should listen (default 3000) |
| api.rootPath | string | `""` | Set the root path of the API, e.g. "/gotenberg/" - for service discovery via URL paths (default "/"). `/health` moves under it: update the probe paths too. |
| api.startTimeout | string | `""` | Set the maximum duration to wait for the API to start |
| api.timeout | string | `""` | Set the time limit for requests (default 30s) |
| api.tlsSecretName | string | `""` | Enables TLS on the API server: K8S TLS secret name containing the TLS certificate and key (tls.crt, tls.key). Set `scheme: HTTPS` on the probes too. |
| autoscaling.behavior | object | `{}` |  |
| autoscaling.enabled | bool | `false` |  |
| autoscaling.extraMetrics | list | `[]` |  |
| autoscaling.maxReplicas | int | `100` |  |
| autoscaling.minReplicas | int | `1` |  |
| autoscaling.targetCPUUtilizationPercentage | int | `80` |  |
| autoscaling.targetMemoryUtilizationPercentage | int | `nil` | Target average memory utilization percentage. Leave unset to not scale on memory. |
| chromium.allowFileAccessFromFiles | bool | `false` | Allow file:// URIs to read other file:// URIs |
| chromium.allowInsecureLocalhost | bool | `false` | Ignore TLS/SSL errors on localhost |
| chromium.allowList | list | `[]` | List of regular expressions for the allowed Chromium URLs. The page sent to the HTML and Markdown routes skips the lists, but the files uploaded with it load from `file:///tmp/`: include `^file:///tmp/` to keep them. Terminate the host, e.g. `^https://assets\.example\.com/`: a match skips the IP-class checks. |
| chromium.autoStart | bool | `false` | Automatically launch Chromium upon initialization if set to true; otherwise, Chromium will start at the time of the first conversion |
| chromium.clearCache | bool | `false` | Clear Chromium cache between each conversion. Only applies with `sharedBrowserContext`. |
| chromium.clearCookies | bool | `false` | Clear Chromium cookies between each conversion. Only applies with `sharedBrowserContext`. |
| chromium.clearStorage | bool | `false` | Clear Chromium local storage between each conversion. Only applies with `sharedBrowserContext`. |
| chromium.debugProtocol | bool | `false` | Log every DevTools Protocol message at the debug log level. The messages carry URLs, cookies and header values, credentials included: enable it only to troubleshoot. |
| chromium.denyList | list | `[]` | List of regular expressions for the denied Chromium URLs. Setting it replaces the upstream default, `^file:(?!//\/tmp/).*`. |
| chromium.denyPrivateIps | bool | `false` | Reject Chromium navigations and sub-resources resolving to a non-public IP (loopback, RFC1918, link-local, IPv6 unique-local). A URL matching `allowList` skips the IP-class check; a URL matching `denyList` is always rejected. With `proxyServer`, a DNS rebinding can slip past it. |
| chromium.denyPublicIps | bool | `false` | Reject Chromium navigations and sub-resources resolving to a public IP. Setting both `denyPrivateIps` and `denyPublicIps` to true rejects every URL unless the allow-list matches. |
| chromium.disableJavaScript | bool | `false` | Disable JavaScript |
| chromium.disableRoutes | bool | `false` | Disable the routes |
| chromium.disableWebSecurity | bool | `false` | Don't enforce the same-origin policy |
| chromium.enableEnvironmentProxy | bool | `false` | Route Chromium's outbound requests through the proxy defined by the standard `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY` variables (set them via `extraEnv`), credentials included. Use this instead of `proxyServer` for authenticated proxies, and leave `proxyServer` and `hostResolverRules` unset. |
| chromium.hostResolverRules | string | `""` | Set custom mappings to the host resolver, e.g. `MAP intranet.local 10.0.0.5`. The IP-class checks still apply to the mapped address. |
| chromium.idleShutdownTimeout | string | `""` | Duration after which idle Chromium browser processes are shut down (e.g., "30s"). Set to 0s or leave empty to disable (default 0s, disabled). |
| chromium.ignoreCertificateErrors | bool | `false` | Ignore the certificate errors |
| chromium.maxConcurrency | int | `nil` | Maximum number of concurrent Chromium conversions, from 1 to 6. Leave unset for the upstream default (6). |
| chromium.maxMemory | string | `""` | Set the memory all Chromium processes together may hold while converting, e.g. "800MB". Over it, Gotenberg restarts Chromium and the conversions in flight answer 503. Chromium, LibreOffice and PDF processing share the container's memory: keep `maxMemory` here and in `libreOffice` together under its limit. Empty disables it. Added in Gotenberg 9.6.0. |
| chromium.maxQueueSize | int | `nil` | Maximum request queue size for Chromium. Set to 0 to disable this feature. Leave unset for the upstream default (0). |
| chromium.proxyServer | string | `""` | Set the outbound proxy server; this switch only affects HTTP and HTTPS requests |
| chromium.restartAfter | int | `nil` | Number of conversions after which Chromium will automatically restart. Set to 0 to disable this feature. Leave unset for the upstream default (100). |
| chromium.sharedBrowserContext | bool | `false` | Share one browser context, with its cookies, cache and storage, across all conversions. Each conversion gets its own isolated context by default; enable this only when all callers trust each other. |
| chromium.startTimeout | string | `""` | Maximum duration to wait for Chromium to start or restart (default 20s) |
| enableServiceLinks | bool | `false` | Inject service discovery environment variables (`<SVCNAME>_SERVICE_HOST`, `<SVCNAME>_PORT`, ...) into the pod. Gotenberg doesn't use them, and they collide with its own configuration: a Service named `api` in the same namespace injects `API_PORT=tcp://<clusterIP>:<port>`, which Gotenberg reads as an override for `--api-port` and refuses to start. |
| extraEnv | list | `[]` | List of extra environment variables for gotenberg container. Every Gotenberg flag also reads an environment variable, which wins over the chart's value, e.g. `API_BIND_IP` for a flag the chart doesn't map. Gotenberg exports traces, metrics and logs with the standard `OTEL_*` variables; to serve Prometheus metrics, use `metrics.enabled` instead. See https://gotenberg.dev/docs/configuration for details. |
| fullnameOverride | string | `""` |  |
| gateway.annotations | object | `{}` | Annotations to add to the HTTPRoute |
| gateway.enabled | bool | `false` | Set to true to create an HTTPRoute resource |
| gateway.hostnames | list | `[]` | Hostnames to match for routing, see values.yaml for an example. |
| gateway.labels | object | `{}` | Labels to add to the HTTPRoute |
| gateway.parentRefs | list | `[]` | Parent Gateway references, see values.yaml for an example. |
| gotenberg.gracefulShutdownDurationSec | int | `30` | Set the graceful shutdown duration in seconds |
| image.digest | string | `""` | Image digest, e.g. `sha256:...`. When set, the image is pulled by digest. |
| image.pullPolicy | string | `"IfNotPresent"` |  |
| image.repository | string | `"gotenberg/gotenberg"` |  |
| image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion. |
| imagePullSecrets | list | `[]` |  |
| ingress.annotations | object | `{}` | Set the annotations of the ingress |
| ingress.className | string | `""` | Set the class name of the ingress |
| ingress.enabled | bool | `false` | Set to true to enable ingress record generation. WARNING: Gotenberg shouldn't be exposed to the internet. |
| ingress.hosts | list | `[]` | Set the hostnames of the ingress, see values.yaml for an example. |
| ingress.labels | object | `{}` | Set the labels of the ingress |
| ingress.tls | list | `[]` | Set the TLS configuration for the ingress, see values.yaml for an example. |
| initContainers | list | `[]` | List of init containers for the gotenberg pod |
| libreOffice.allowList | list | `[]` | List of regular expressions for the allowed URLs LibreOffice requests: the style sheets an HTML document links, and the URLs macros open with `enableMacros`. Terminate the host: a match skips the IP-class checks. |
| libreOffice.autoStart | bool | `false` | Automatically launch LibreOffice upon initialization if set to true; otherwise, LibreOffice will start at the time of the first conversion (default false) |
| libreOffice.denyList | list | `[]` | List of regular expressions for the denied URLs LibreOffice requests |
| libreOffice.denyPrivateIps | bool | `false` | Reject LibreOffice requests resolving to a non-public IP (loopback, RFC1918, link-local, IPv6 unique-local). A URL matching `allowList` skips the IP-class check; a URL matching `denyList` is always rejected. |
| libreOffice.denyPublicIps | bool | `false` | Reject LibreOffice requests resolving to a public IP. Setting both `denyPrivateIps` and `denyPublicIps` to true rejects every URL unless the allow-list matches. |
| libreOffice.disableRoutes | bool | `false` | Disable the routes |
| libreOffice.enableEnvironmentProxy | bool | `false` | Route LibreOffice requests through the proxy defined by the standard `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY` variables (set them via `extraEnv`), credentials included. |
| libreOffice.enableMacros | bool | `false` | Run the macros of converted documents, including those bound to document events. Macros run code inside the container: enable it only for trusted documents. |
| libreOffice.idleShutdownTimeout | string | `""` | Duration after which idle LibreOffice processes are shut down (e.g., "30s"). Set to 0s or leave empty to disable (default 0s, disabled). |
| libreOffice.maxMemory | string | `""` | Set the memory LibreOffice may hold during a conversion, e.g. "900MB". Over it, Gotenberg kills LibreOffice and answers that conversion 422. Keep it and `chromium.maxMemory` together under the container's memory limit. Empty disables it. Added in Gotenberg 9.6.0. |
| libreOffice.maxQueueSize | int | `nil` | Maximum request queue size for LibreOffice. Set to 0 to disable this feature. Leave unset for the upstream default (0). |
| libreOffice.restartAfter | int | `nil` | Number of conversions after which LibreOffice will automatically restart. Set to 0 to disable this feature. Leave unset for the upstream default (10). |
| libreOffice.startTimeout | string | `""` | Maximum duration to wait for LibreOffice to start or restart (default 20s) |
| lifecycle | object | `{"preStop":{"sleep":{"seconds":5}}}` | Define the container lifecycle hooks. The default `preStop` sleep keeps the server accepting connections while Service endpoints propagate on shutdown, which prevents dropped connections during scale-down and rolling updates: an idle Gotenberg exits within milliseconds of SIGTERM. The `sleep` action needs Kubernetes 1.30; set `lifecycle: {}` on older clusters. |
| livenessProbe | object | `{"httpGet":{"path":"/health","port":"http"}}` | Define the liveness probe object for the container. |
| logging.fieldsPrefix | string | `""` | Prepend a specified prefix to each field in the logs |
| logging.level | string | `""` | Set the log level - error, warn, info, or debug (default "info") |
| logging.stdEnableGcpFields | bool | `false` | Enable GCP log field mapping for Cloud Run |
| logging.stdFormat | string | `""` | Set the log format - auto, json, or text (default "auto"). Gotenberg logs to stderr. |
| logging.stdLevelCase | string | `""` | Set the case of the `level` field - lower or upper (default "lower") |
| metrics.enabled | bool | `false` | Serve Prometheus metrics at `/metrics` on `metrics.port`, through Gotenberg's OpenTelemetry Prometheus exporter, with a ClusterIP `<fullname>-metrics` Service. Also on when `serviceMonitor.enabled` is true. The chart then sets the `OTEL_METRICS_EXPORTER` and `OTEL_EXPORTER_PROMETHEUS_*` variables, so `extraEnv` can't. |
| metrics.port | int | `9464` | Port of the Prometheus metrics endpoint, on the container and the metrics Service. Must differ from `api.port`. |
| metrics.service.annotations | object | `{}` | Annotations to add to the metrics Service |
| metrics.service.labels | object | `{}` | Labels to add to the metrics Service |
| metrics.serviceMonitor.annotations | object | `{}` | Additional annotations for the service monitor |
| metrics.serviceMonitor.enabled | bool | `false` | Enable ServiceMonitor. Turns the metrics endpoint on. |
| metrics.serviceMonitor.honorLabels | bool | `false` | HonorLabels chooses the metric’s labels on collisions with target labels |
| metrics.serviceMonitor.interval | string | `nil` | Interval at which metrics should be scraped |
| metrics.serviceMonitor.jobLabel | string | `nil` | Optional job label for the target service in Prometheus |
| metrics.serviceMonitor.labels | object | `{}` | Additional labels for the service monitor |
| metrics.serviceMonitor.metricRelabelings | list | `[]` | List of metric relabel configs to apply to samples before ingestion |
| metrics.serviceMonitor.namespace | string | `nil` | Namespace for ServiceMonitor, defaults to release namespace |
| metrics.serviceMonitor.relabelings | list | `[]` | List of relabel configs to apply to samples before scraping |
| metrics.serviceMonitor.scrapeTimeout | string | `nil` | Timeout after which the scrape is ended |
| nameOverride | string | `""` |  |
| networkPolicy.egress | list | `[{}]` | Egress rules. The default allows all traffic; `[]` denies all. See `ci/hardened-values.yaml` for an example. |
| networkPolicy.enabled | bool | `false` | Create a NetworkPolicy for the Gotenberg pods |
| networkPolicy.ingress | list | `[{}]` | Ingress rules. The default allows all traffic; `[]` denies all. See values.yaml for an example. |
| nodeSelector | object | `{}` |  |
| pdb.enabled | bool | `false` | Create a PodDisruptionBudget |
| pdb.maxUnavailable | int or string | `nil` | Pods that may be unavailable, as a number or a percentage such as "25%". Set this or `minAvailable`. |
| pdb.minAvailable | int or string | `nil` | Pods that must stay available, as a number or a percentage such as "50%". Set this or `maxUnavailable`; with neither, the PDB keeps 1 available. |
| pdb.unhealthyPodEvictionPolicy | string | `nil` | Unhealthy pod eviction policy for the PDB (e.g., AlwaysAllow) |
| pdf.allowList | list | `[]` | List of regular expressions for the allowed timestamp authority URLs of the sign and timestamp stages. Terminate the host: a match skips the IP-class checks. |
| pdf.denyList | list | `[]` | List of regular expressions for the denied timestamp authority URLs of the sign and timestamp stages |
| pdf.denyPrivateIps | bool | `false` | Reject timestamp authority URLs resolving to a non-public IP (loopback, RFC1918, link-local, IPv6 unique-local). Callers choose these URLs: enable it for untrusted callers. A URL matching `allowList` skips the IP-class check. |
| pdf.denyPublicIps | bool | `false` | Reject timestamp authority URLs resolving to a public IP |
| pdf.disableRoutes | bool | `false` | Disable the /forms/pdf routes. Conversion routes still run stages: set `disableStages` too to turn off PDF processing. |
| pdf.disableStages | bool | `false` | Refuse the `stages` field of the Chromium and LibreOffice routes, so they only convert. Added in Gotenberg 9.3.0. |
| pdf.enableEnvironmentProxy | bool | `false` | Route timestamp authority requests through the proxy defined by the standard `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY` variables (set them via `extraEnv`), credentials included. |
| pdf.maxConcurrency | int | `nil` | Maximum number of PDF documents a request processes at once. Leave unset for the upstream default (1). |
| pdf.maxEmbeddedFileBytes | string | `""` | Set the maximum size of an embedded file read for validation, e.g. "100MB" (default 50MiB) |
| pdf.maxImagePixels | int | `nil` | Set the maximum number of pixels an image may hold. Leave unset for the upstream default (100000000). |
| pdf.maxRenderPixels | int | `nil` | Set the maximum number of pixels a page the render stage draws may hold, at 16 bytes of memory each. Leave unset for the upstream default (50000000). Added in Gotenberg 9.3.0. |
| pdf.maxStreamBytes | string | `""` | Set the maximum size a PDF stream may decode to, e.g. "512MB" (default 256MiB) |
| podAnnotations | object | `{}` |  |
| podLabels | object | `{}` | List of additional pod labels |
| podSecurityContext | object | `{}` |  |
| progressDeadlineSeconds | int | `600` | Seconds a rollout may take before Kubernetes reports it failed. Each node pulls the 1.5GB image on an upgrade. |
| readinessProbe | object | `{"httpGet":{"path":"/health","port":"http"}}` | Define the readiness probe object for the container. |
| replicaCount | int | `1` |  |
| resources | object | `{}` |  |
| securityContext | object | Meets the Pod Security `restricted` level: runs as non-root user 1001, with no privilege escalation, all capabilities dropped and the `RuntimeDefault` seccomp profile unless `podSecurityContext` sets one. On OpenShift, the user, non-root check and seccomp profile are left to the SCC. The root filesystem stays writable for Chromium. | Define the security context for the container. Replaces the default entirely when set. |
| service.annotations | object | `{}` | Annotations to add to the service |
| service.port | int | `80` |  |
| service.type | string | `"ClusterIP"` |  |
| serviceAccount.annotations | object | `{}` | Annotations to add to the service account |
| serviceAccount.automount | bool | `false` | Mount the service account's API token in the pods. Gotenberg doesn't use the Kubernetes API. |
| serviceAccount.create | bool | `false` | Specifies whether a service account should be created |
| serviceAccount.name | string | `""` | The name of the service account to use. # If not set and create is true, a name is generated using the fullname template |
| startupProbe | object | `{"failureThreshold":30,"httpGet":{"path":"/health","port":"http"},"periodSeconds":10}` | Define the startup probe object for the container. |
| strategy | object | `{}` |  |
| terminationGracePeriodSeconds | int | `nil` | Seconds Kubernetes waits for the pod to stop. Leave unset for `gotenberg.gracefulShutdownDurationSec` plus 10, which covers the `preStop` sleep. |
| testImage | object | `{"digest":"sha256:a46257e06c82ad85242d0d38077d0a52d9896389ca60a1a59d3463db586e5fa4","repository":"busybox","tag":"1.38.0"}` | Image configuration for the helm test pod |
| testImage.digest | string | `"sha256:a46257e06c82ad85242d0d38077d0a52d9896389ca60a1a59d3463db586e5fa4"` | Digest for the test image. Set to "" to pull by tag only. |
| testImage.repository | string | `"busybox"` | Repository for the test image |
| testImage.tag | string | `"1.38.0"` | Tag for the test image |
| testPodAnnotations | object | `{}` | Set annotations for the helm test pods (for example to disable certain kube-score checks) |
| tolerations | list | `[]` |  |
| topologySpreadConstraints | list | `[]` |  |
| volumeMounts | list | `[]` |  |
| volumes | list | `[]` |  |
| vpa.enabled | bool | `false` | Create a VerticalPodAutoscaler resource for right-sizing pod resources. Requires the VPA controller to be installed in the cluster. See also: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler |
| vpa.resourcePolicy | object | `{}` | Resource policy for VPA to control which containers and resources are autoscaled, see values.yaml for an example. |
| vpa.updateMode | string | `"Auto"` | Update mode for VPA: Auto (resize in-place or restart), Recreate (restart to resize), Initial (set at creation only), Off (recommendations only) |
| webhook.allowList | list | `[]` | List of regular expressions for the allowed webhook URLs. Terminate the host: a match skips the IP-class checks. |
| webhook.clientTimeout | string | `""` | Set the time limit for requests to the webhook (default 30s) |
| webhook.denyList | list | `[]` | List of regular expressions for the denied webhook URLs |
| webhook.denyPrivateIps | bool | `false` | Reject webhook URLs (result and events) resolving to a non-public IP (loopback, RFC1918, link-local, IPv6 unique-local). A URL matching `allowList` skips the IP-class check; a URL matching `denyList` is always rejected. |
| webhook.denyPublicIps | bool | `false` | Reject webhook URLs resolving to a public IP. Setting both `denyPrivateIps` and `denyPublicIps` to true rejects every URL unless the allow-list matches. |
| webhook.disable | bool | `false` | Disable the webhook feature |
| webhook.enableEnvironmentProxy | bool | `false` | Route webhook callbacks through the proxy defined by the standard `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY` variables (set them via `extraEnv`), credentials included. |
| webhook.enableSyncMode | bool | `false` | Enable synchronous mode for the webhook feature |
| webhook.maxRetry | int | `nil` | Set the maximum number of retries for the webhook feature. Leave unset for the upstream default (4). |
| webhook.retryMaxWait | string | `""` | Set the maximum duration to wait before trying to call the webhook again (default 30s) |
| webhook.retryMinWait | string | `""` | Set the minimum duration to wait before trying to call the webhook again (default 1s) |
