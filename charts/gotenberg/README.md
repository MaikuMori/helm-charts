# Gotenberg

[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/gotenberg)](https://artifacthub.io/packages/helm/maikumori/gotenberg)
![Version: 1.13.0](https://img.shields.io/badge/Version-1.13.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: 8.23.2](https://img.shields.io/badge/AppVersion-8.23.2-informational?style=flat-square)

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
| api.basicAuthPassword | string | `nil` | Set the basic authentication password (ignored if existingSecret is set) |
| api.basicAuthUsername | string | `nil` | Set the basic authentication username (ignored if existingSecret is set) |
| api.disableDownloadFrom | bool | `false` | Disable the download from feature |
| api.disableHealthCheckLogging | bool | `false` | Disable health check logging |
| api.downloadFromAllowList | string | `""` | Set the allowed URLs for the download from feature using a regular expression |
| api.downloadFromDenyList | string | `""` | Set the denied URLs for the download from feature using a regular expression |
| api.downloadFromMaxRetry | int | `4` | Set the maximum number of retries for the download from feature (default 4) |
| api.enableBasicAuth | bool | `false` | Enable basic authentication, see also the basicAuthUsername and basicAuthPassword values |
| api.existingSecret | string | `""` | Name of an existing secret containing basic auth credentials (keys: username, password) |
| api.existingSecretPasswordKey | string | `""` | Key in existingSecret for the password (default: password) |
| api.existingSecretUsernameKey | string | `""` | Key in existingSecret for the username (default: username) |
| api.port | int | `3000` | Set the port on which the API should listen (default 3000) |
| api.rootPath | string | `""` | Set the root path of the API - for service discovery via URL paths (default "/") |
| api.timeout | string | `""` | Set the time limit for requests (default 30s) |
| api.tlsSecretName | string | `""` | Enables TLS on the API server: K8S TLS secret name containing the TLS certificate and key (tls.crt, tls.key) |
| api.traceHeader | string | `""` | Set the header name to use for identifying requests (default "Gotenberg-Trace") |
| autoscaling.behavior | object | `{}` |  |
| autoscaling.enabled | bool | `false` |  |
| autoscaling.extraMetrics | list | `[]` |  |
| autoscaling.maxReplicas | int | `100` |  |
| autoscaling.minReplicas | int | `1` |  |
| autoscaling.targetCPUUtilizationPercentage | int | `80` |  |
| chromium.allowFileAccessFromFiles | bool | `false` | Allow file:// URIs to read other file:// URIs |
| chromium.allowInsecureLocalhost | bool | `false` | Ignore TLS/SSL errors on localhost |
| chromium.allowList | string | `""` | Set the allowed URLs for Chromium using a regular expression |
| chromium.autoStart | bool | `false` | Automatically launch Chromium upon initialization if set to true; otherwise, Chromium will start at the time of the first conversion |
| chromium.clearCache | bool | `false` | Clear Chromium cache between each conversion. |
| chromium.clearCookies | bool | `false` | Clear Chromium cookies between each conversion. |
| chromium.denyList | string | `""` | Set the denied URLs for Chromium using a regular expression (default "^file:///[^tmp].*") |
| chromium.disableJavaScript | bool | `false` | Disable JavaScript |
| chromium.disableRoutes | bool | `false` | Disable the routes |
| chromium.disableWebSecurity | bool | `false` | Don't enforce the same-origin policy |
| chromium.hostResolverRules | string | `""` | Set custom mappings to the host resolver |
| chromium.ignoreCertificateErrors | bool | `false` | Ignore the certificate errors |
| chromium.incognito | bool | `false` | Start Chromium with incognito mode |
| chromium.maxQueueSize | int | `0` | Maximum request queue size for Chromium. Set to 0 to disable this feature. |
| chromium.proxyServer | string | `""` | Set the outbound proxy server; this switch only affects HTTP and HTTPS requests |
| chromium.restartAfter | string | `""` | Number of conversions after which Chromium will automatically restart. Set to 0 to disable this feature |
| chromium.startTimeout | string | `""` | Maximum duration to wait for Chromium to start or restart |
| extraEnv | list | `[]` | List of extra environment variables for gotenberg container |
| fullnameOverride | string | `""` |  |
| gotenberg.gracefulShutdownDurationSec | int | `30` | Set the graceful shutdown duration (default 30s) |
| image.pullPolicy | string | `"IfNotPresent"` |  |
| image.repository | string | `"gotenberg/gotenberg"` |  |
| image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion. |
| imagePullSecrets | list | `[]` |  |
| ingress.annotations | object | `{}` | Set the annotations of the ingress |
| ingress.className | string | `""` | Set the class name of the ingress |
| ingress.enabled | bool | `false` | Set to true to enable ingress record generation. WARNING: Gotenberg shouldn't be exposed to the internet. |
| ingress.hosts | list | `[]` | Set the hostnames of the ingress, see values.yaml for an example. |
| ingress.tls | list | `[]` | Set the TLS configuration for the ingress, see values.yaml for an example. |
| libreOffice.autoStart | bool | `false` | Automatically launch LibreOffce upon initialization if set to true; otherwise, LibreOffice will start at the time of the first conversion (default false) |
| libreOffice.disableRoutes | bool | `false` | Disable the routes |
| libreOffice.maxQueueSize | int | `0` | Maximum request queue size for LibreOffice. Set to 0 to disable this feature. |
| libreOffice.restartAfter | string | `""` | Number of conversions after which LibreOffice will automatically restart. Set to 0 to disable this feature (default 10) |
| libreOffice.startTimeout | string | `""` | Maximum duration to wait for LibreOffice to start or restart (default 10s) |
| livenessProbe | object | `{"httpGet":{"path":"/health","port":"http"}}` | Define the liveness probe object for the container. +docs:property livenessProbe: {} |
| logging.enableGcpFields | bool | `false` | Enable GCP log field mapping for Cloud Run |
| logging.fieldsPrefix | string | `""` | Prepend a specified prefix to each field in the logs |
| logging.format | string | `""` | Set log format - auto, json, or text (default "auto") |
| logging.level | string | `""` | Set the log level - error, warn, info, or debug (default "info") |
| metrics.serviceMonitor.annotations | object | `{}` | Additional annotations for the service monitor |
| metrics.serviceMonitor.enabled | bool | `false` | Enable ServiceMonitor |
| metrics.serviceMonitor.honorLabels | bool | `false` | HonorLabels chooses the metric’s labels on collisions with target labels |
| metrics.serviceMonitor.interval | string | `nil` | Interval at which metrics should be scraped |
| metrics.serviceMonitor.jobLabel | string | `nil` | Optional job label for the target service in Prometheus |
| metrics.serviceMonitor.labels | object | `{}` | Additional labels for the service monitor |
| metrics.serviceMonitor.metricRelabelings | list | `[]` | List of metric relabel configs to apply to samples before ingestion |
| metrics.serviceMonitor.namespace | string | `nil` | Namespace for ServiceMonitor, defaults to release namespace |
| metrics.serviceMonitor.relabelings | list | `[]` | List of relabel configs to apply to samples before scraping |
| metrics.serviceMonitor.scrapeTimeout | string | `nil` | Timeout after which the scrape is ended |
| nameOverride | string | `""` |  |
| networkPolicy.allowEgress | bool | `true` |  |
| networkPolicy.allowIngress | bool | `true` |  |
| networkPolicy.enabled | bool | `false` |  |
| networkPolicy.extraEgress | list | `[]` |  |
| networkPolicy.extraIngress | list | `[]` |  |
| nodeSelector | object | `{}` |  |
| pdb.create | bool | `false` |  |
| pdb.maxUnavailable | string | `""` |  |
| pdb.minAvailable | int | `1` |  |
| pdb.unhealthyPodEvictionPolicy | string | `nil` | This is a beta feature, so it's not enabled by default. |
| pdfEngines.convertEngines | string | `""` | Set the PDF engines and their order for the convert feature (default libreoffice-pdfengine) |
| pdfEngines.disableRoutes | bool | `false` | Disable the routes |
| pdfEngines.engines | DEPRECATED in Gotenberg 8.13.0 | `""` | Set the PDF engines and their order - all by default |
| pdfEngines.mergeEngines | string | `""` | Set the PDF engines and their order for the merge feature (default qpdf,pdfcpu,pdftk) |
| pdfEngines.readMetadataEngines | string | `""` | Set the PDF engines and their order for the read metadata feature (default exiftool) |
| pdfEngines.writeMetadataEngines | string | `""` | Set the PDF engines and their order for the write metadata feature (default exiftool) |
| podAnnotations | object | `{}` |  |
| podLabels | object | `{}` | List of additional pod labels |
| podSecurityContext | object | `{}` |  |
| progressDeadlineSeconds | int | `120` |  |
| prometheus.collectInterval | string | `""` | Set the interval for collecting modules' metrics (default 1s) |
| prometheus.disableCollect | bool | `false` | Disable the collect of metrics |
| prometheus.disableRouterLogging | bool | `false` | Disable the route logging |
| prometheus.namespace | string | `""` | Set the namespace of modules' metrics (default "gotenberg") |
| readinessProbe | object | `{"httpGet":{"path":"/health","port":"http"}}` | Define the readiness probe object for the container. +docs:property readinessProbe: {} |
| replicaCount | int | `1` |  |
| resources | object | `{}` |  |
| securityContext | object | `{ privileged: false, runAsUser: 1001 }`, except in OpenShift where `runAsUser` is not set. | Define the security context for the container. By default will use upstream recommended values. |
| service.annotations | object | `{}` | Annotations to add to the service |
| service.port | int | `80` |  |
| service.type | string | `"ClusterIP"` |  |
| serviceAccount.annotations | object | `{}` | Annotations to add to the service account |
| serviceAccount.create | bool | `false` | Specifies whether a service account should be created |
| serviceAccount.name | string | `""` | The name of the service account to use. # If not set and create is true, a name is generated using the fullname template |
| startupProbe | object | `{"failureThreshold":30,"httpGet":{"path":"/health","port":"http"},"periodSeconds":10}` | Define the startup probe object for the container. +docs:property startupProbe: {} |
| strategy | object | `{}` |  |
| testPodAnnotations | object | `{}` | Set annotations for the helm test pods (for example to disable certain kube-score checks) |
| tolerations | list | `[]` |  |
| topologySpreadConstraints | list | `[]` |  |
| volumeMounts | list | `[]` |  |
| volumes | list | `[]` |  |
| webhook.allowList | string | `""` | Set the allowed URLs for the webhook feature using a regular expression |
| webhook.clientTimeout | string | `""` | Set the time limit for requests to the webhook (default 30s) |
| webhook.denyList | string | `""` | Set the denied URLs for the webhook feature using a regular expression |
| webhook.disable | bool | `false` | Disable the webhook feature |
| webhook.errorAllowList | string | `""` | Set the allowed URLs in case of an error for the webhook feature using a regular expression |
| webhook.errorDenyList | string | `""` | Set the denied URLs in case of an error for the webhook feature using a regular expression |
| webhook.maxRetry | string | `""` | Set the maximum number of retries for the webhook feature (default 4) |
| webhook.retryMaxWait | string | `""` | Set the maximum duration to wait before trying to call the webhook again (default 30s) |
| webhook.retryMinWait | string | `""` | Set the minimum duration to wait before trying to call the webhook again (default 1s) |
