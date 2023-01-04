# Gotenberg

[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/gotenberg)](https://artifacthub.io/packages/search?repo=gotenberg)
![Version: 0.2.1](https://img.shields.io/badge/Version-0.2.1-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 7.7.2](https://img.shields.io/badge/AppVersion-7.7.2-informational?style=flat-square)

This is a HELM chart for Gotenberg.

Gotenberg provides a developer-friendly API to interact with powerful tools like Chromium and LibreOffice for converting numerous document formats (HTML, Markdown, Word, Excel, etc.) into PDF files, and more!

Upstream links:

- [Homepage](https://gotenberg.dev/)
- [Documentation](https://gotenberg.dev/docs/about)
- [GitHub](https://github.com/gotenberg/gotenberg)

## Get Repo Info

```console
helm repo add maikumori https://maikumori.github.io/helm-charts
helm repo update
```

## Installing the Chart

To install the chart with the release name `my-release`:

```console
helm install my-release --namespace gotenberg maikumori/gotenberg
```

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```console
helm delete my-release
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Upgrading Chart

```console
helm upgrade my-release maikumori/gotenberg --install
```

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` |  |
| api.disableHealthCheckLogging | bool | `false` | Disable health check logging |
| api.port | int | `3000` | Set the port on which the API should listen (default 3000) |
| api.rootPath | string | `""` | Set the root path of the API - for service discovery via URL paths (default "/") |
| api.timeout | string | `""` | Set the time limit for requests (default 30s) |
| api.traceHeader | string | `""` | Set the header name to use for identifying requests (default "Gotenberg-Trace") |
| autoscaling.enabled | bool | `false` |  |
| autoscaling.maxReplicas | int | `100` |  |
| autoscaling.minReplicas | int | `1` |  |
| autoscaling.targetCPUUtilizationPercentage | int | `80` |  |
| chromium.allowFileAccessFromFiles | bool | `false` | Allow file:// URIs to read other file:// URIs |
| chromium.allowInsecureLocalhost | bool | `false` | Ignore TLS/SSL errors on localhost |
| chromium.allowList | string | `""` | Set the allowed URLs for Chromium using a regular expression |
| chromium.denyList | string | `""` | Set the denied URLs for Chromium using a regular expression (default "^file:///[^tmp].*") |
| chromium.disableJavaScript | bool | `false` | Disable JavaScript |
| chromium.disableRoutes | bool | `false` | Disable the routes |
| chromium.disableWebSecurity | bool | `false` | Don't enforce the same-origin policy |
| chromium.hostResolverRules | string | `""` | Set custom mappings to the host resolver |
| chromium.ignoreCertificateErrors | bool | `false` | Ignore the certificate errors |
| chromium.incognito | bool | `false` | Start Chromium with incognito mode |
| chromium.proxyServer | string | `""` | Set the outbound proxy server; this switch only affects HTTP and HTTPS requests |
| fullnameOverride | string | `""` |  |
| gotenberg.gracefulShutdownDurationSec | int | `30` | Set the graceful shutdown duration (default 30s) |
| image.pullPolicy | string | `"IfNotPresent"` |  |
| image.repository | string | `"gotenberg/gotenberg"` |  |
| image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion. |
| imagePullSecrets | list | `[]` |  |
| libreOffice.disableRoutes | bool | `false` | Disable the routes |
| libreOffice.unoListenerRestartThreshold | string | `""` | Conversions limit after which the LibreOffice listener is restarted - 0 means no long-running LibreOffice listener (default 10) |
| libreOffice.unoListenerStartTimeout | string | `""` | Time limit for starting the LibreOffice listener (default 10s) |
| logging.format | string | `""` | Set log format - auto, json, or text (default "auto") |
| logging.level | string | `""` | Set the log level - error, warn, info, or debug (default "info") |
| nameOverride | string | `""` |  |
| nodeSelector | object | `{}` |  |
| pdfEngines.disableRoutes | bool | `false` | Disable the routes |
| pdfEngines.engines | string | `""` | Set the PDF engines and their order - all by default |
| podAnnotations | object | `{}` |  |
| podSecurityContext | object | `{}` |  |
| prometheus.collectInterval | string | `""` | Set the interval for collecting modules' metrics (default 1s) |
| prometheus.disableCollect | bool | `false` | Disable the collect of metrics |
| prometheus.disableRouterLogging | bool | `false` | Disable the route logging |
| prometheus.namespece | string | `""` | Set the namespace of modules' metrics (default "gotenberg") |
| replicaCount | int | `1` |  |
| resources | object | `{}` |  |
| securityContext.privileged | bool | `false` |  |
| securityContext.runAsUser | int | `1001` |  |
| service.port | int | `80` |  |
| service.type | string | `"ClusterIP"` |  |
| serviceAccount.annotations | object | `{}` | Annotations to add to the service account |
| serviceAccount.create | bool | `false` | Specifies whether a service account should be created |
| serviceAccount.name | string | `""` | The name of the service account to use. # If not set and create is true, a name is generated using the fullname template |
| tolerations | list | `[]` |  |
| webhook.allowList | string | `""` | Set the allowed URLs for the webhook feature using a regular expression |
| webhook.clientTimeout | string | `""` | Set the time limit for requests to the webhook (default 30s) |
| webhook.denyList | string | `""` | Set the denied URLs for the webhook feature using a regular expression |
| webhook.disable | bool | `false` | Disable the webhook feature |
| webhook.errorAllowList | string | `""` | Set the allowed URLs in case of an error for the webhook feature using a regular expression |
| webhook.errorDenyList | string | `""` | Set the denied URLs in case of an error for the webhook feature using a regular expression |
| webhook.maxRetry | string | `""` | Set the maximum number of retries for the webhook feature (default 4) |
| webhook.retryMaxWait | string | `""` | Set the maximum duration to wait before trying to call the webhook again (default 30s) |
| webhook.retryMinWait | string | `""` | Set the minimum duration to wait before trying to call the webhook again (default 1s) |
