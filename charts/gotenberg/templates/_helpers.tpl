{{/*
Expand the name of the chart.
*/}}
{{- define "gotenberg.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "gotenberg.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "gotenberg.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "gotenberg.labels" -}}
helm.sh/chart: {{ include "gotenberg.chart" . }}
{{ include "gotenberg.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "gotenberg.selectorLabels" -}}
app.kubernetes.io/name: {{ include "gotenberg.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Labels for helm test pods. Their name differs from the selector labels, so the
Service, PodDisruptionBudget and NetworkPolicy don't select them.
*/}}
{{- define "gotenberg.testLabels" -}}
{{- $name := include "gotenberg.name" . -}}
{{- $prefix := $name | trunc 58 | trimSuffix "-" -}}
helm.sh/chart: {{ include "gotenberg.chart" . }}
app.kubernetes.io/name: {{ ternary (printf "%s-hook" $prefix) (printf "%s-test" $prefix) (eq (printf "%s-test" $prefix) $name) }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: test
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "gotenberg.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "gotenberg.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create a security context

Restricted by default, with the keys .Values.securityContext sets on top.
On OpenShift, the user, non-root check and seccomp profile are left to the SCC, since the image's
user isn't numeric and a pod that sets a seccomp profile can't be admitted under SCCs without
seccompProfiles, such as anyuid.
Elsewhere, the seccomp profile is left to the pod when podSecurityContext sets one.
The root filesystem stays writable for Chromium (gotenberg/gotenberg#949).
*/}}
{{- define "gotenberg.securityContext" -}}
{{- $openshift := .Capabilities.APIVersions.Has "security.openshift.io/v1" }}
{{- $default := dict "privileged" false "allowPrivilegeEscalation" false "capabilities" (dict "drop" (list "ALL")) "readOnlyRootFilesystem" false }}
{{- if not $openshift }}
{{- $_ := set $default "runAsUser" 1001 }}
{{- $_ := set $default "runAsNonRoot" true }}
{{- end }}
{{- if not (or .Values.podSecurityContext.seccompProfile $openshift) }}
{{- $_ := set $default "seccompProfile" (dict "type" "RuntimeDefault") }}
{{- end }}
{{- mergeOverwrite $default (deepCopy (.Values.securityContext | default dict)) | toYaml }}
{{- end }}

{{/*
Whether the Prometheus metrics endpoint is served.
*/}}
{{- define "gotenberg.metricsEnabled" -}}
{{- if and .Values.metrics (or .Values.metrics.enabled (and .Values.metrics.serviceMonitor .Values.metrics.serviceMonitor.enabled)) }}true{{ end }}
{{- end }}

{{/*
Fails on settings that conflict with the chart's metrics endpoint.
*/}}
{{- define "gotenberg.validateMetrics" -}}
{{- if eq (int .Values.metrics.port) (int .Values.api.port) }}
{{- fail "metrics.port must differ from api.port" }}
{{- end }}
{{- range .Values.extraEnv }}
{{- if has .name (list "OTEL_METRICS_EXPORTER" "OTEL_EXPORTER_PROMETHEUS_HOST" "OTEL_EXPORTER_PROMETHEUS_PORT") }}
{{- fail (printf "extraEnv sets %s, which the chart sets for metrics.enabled: use metrics.port, or turn metrics off to configure the exporter yourself" .name) }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Fails on authentication settings Gotenberg refuses at startup.
*/}}
{{- define "gotenberg.validateAuth" -}}
{{- $auth := .Values.api.basicAuth }}
{{- if $auth.enabled }}
{{- if .Values.api.enableOidcAuth }}
{{- fail "api.basicAuth.enabled and api.enableOidcAuth are mutually exclusive" }}
{{- end }}
{{- $fromEnv := list }}
{{- range .Values.extraEnv }}
{{- $fromEnv = append $fromEnv .name }}
{{- end }}
{{- $inEnv := and (has "GOTENBERG_API_BASIC_AUTH_USERNAME" $fromEnv) (has "GOTENBERG_API_BASIC_AUTH_PASSWORD" $fromEnv) }}
{{- if not (or $auth.existingSecret (and $auth.username $auth.password) $inEnv) }}
{{- fail "api.basicAuth.enabled needs api.basicAuth.existingSecret, or api.basicAuth.username and password" }}
{{- end }}
{{- end }}
{{- if and .Values.api.enableOidcAuth (not (and .Values.api.oidcIssuer .Values.api.oidcAudience)) }}
{{- fail "api.enableOidcAuth needs api.oidcIssuer and api.oidcAudience" }}
{{- end }}
{{- end }}

{{/*
A probe as set in values, with the default HTTP check following
api.tlsSecretName and api.rootPath. A probe with another handler drops the
default httpGet, which Kubernetes refuses next to it.
*/}}
{{- define "gotenberg.probe" -}}
{{- $probe := deepCopy (index . 0) }}
{{- $tls := index . 1 }}
{{- $rootPath := index . 2 }}
{{- if or (hasKey $probe "exec") (hasKey $probe "tcpSocket") (hasKey $probe "grpc") }}
{{- $_ := unset $probe "httpGet" }}
{{- else if hasKey $probe "httpGet" }}
{{- $http := get $probe "httpGet" }}
{{- if and $tls (not (hasKey $http "scheme")) }}
{{- $_ := set $http "scheme" "HTTPS" }}
{{- end }}
{{- if and $rootPath (eq (toString (get $http "path")) "/health") }}
{{- $_ := set $http "path" (printf "%s/health" ($rootPath | trimSuffix "/")) }}
{{- end }}
{{- end }}
{{- toYaml $probe }}
{{- end }}

{{/*
A list entry as one CSV field: Gotenberg splits list flags on commas.
*/}}
{{- define "gotenberg.csvField" -}}
{{- if regexMatch "[,\"\n\r]|^\\s|\\s$" . }}
{{- printf "\"%s\"" (replace "\"" "\"\"" .) }}
{{- else }}
{{- . }}
{{- end }}
{{- end }}

{{/*
Name of the metrics Service, never the same as the API Service's.
*/}}
{{- define "gotenberg.metricsServiceName" -}}
{{- $fullname := include "gotenberg.fullname" . }}
{{- $name := printf "%s-metrics" ($fullname | trunc 55 | trimSuffix "-") }}
{{- if eq $name $fullname }}
{{- $name = printf "%s-metrics" ($fullname | trunc 54 | trimSuffix "-") }}
{{- end }}
{{- $name }}
{{- end }}

{{/*
The Gotenberg flag each value maps to, rendered as container args. A null value
leaves Gotenberg's default; any other value is passed as is: 0, false and ""
included, a list as one flag per entry, and an empty list as an empty flag.
test/flags-test.js reads this table.
*/}}
{{- define "gotenberg.flags" -}}
{{- range list
  (list "api-bind-ip" .Values.api.bindIp)
  (list "api-timeout" .Values.api.timeout)
  (list "api-body-limit" .Values.api.bodyLimit)
  (list "api-root-path" .Values.api.rootPath)
  (list "api-correlation-id-header" .Values.api.correlationIdHeader)
  (list "api-disable-health-check-route-telemetry" .Values.api.disableHealthCheckRouteTelemetry)
  (list "api-enable-debug-route" .Values.api.enableDebugRoute)
  (list "api-start-timeout" .Values.api.startTimeout)
  (list "api-enable-oidc-auth" .Values.api.enableOidcAuth)
  (list "api-oidc-issuer" .Values.api.oidcIssuer)
  (list "api-oidc-audience" .Values.api.oidcAudience)
  (list "api-oidc-jwks-url" .Values.api.oidcJwksUrl)
  (list "api-download-from-allow-list" .Values.api.downloadFromAllowList)
  (list "api-download-from-deny-list" .Values.api.downloadFromDenyList)
  (list "api-download-from-deny-private-ips" .Values.api.downloadFromDenyPrivateIps)
  (list "api-download-from-deny-public-ips" .Values.api.downloadFromDenyPublicIps)
  (list "api-download-from-max-retry" .Values.api.downloadFromMaxRetry)
  (list "api-download-from-max-concurrency" .Values.api.downloadFromMaxConcurrency)
  (list "api-download-from-max-entries" .Values.api.downloadFromMaxEntries)
  (list "api-download-from-enable-environment-proxy" .Values.api.downloadFromEnableEnvironmentProxy)
  (list "api-disable-download-from" .Values.api.disableDownloadFrom)
  (list "api-archive-max-entries" .Values.api.archiveMaxEntries)
  (list "api-archive-max-ratio" .Values.api.archiveMaxRatio)
  (list "api-disable-root-route-telemetry" .Values.api.disableRootRouteTelemetry)
  (list "api-disable-debug-route-telemetry" .Values.api.disableDebugRouteTelemetry)
  (list "api-disable-version-route-telemetry" .Values.api.disableVersionRouteTelemetry)
  (list "chromium-restart-after" .Values.chromium.restartAfter)
  (list "chromium-auto-start" .Values.chromium.autoStart)
  (list "chromium-start-timeout" .Values.chromium.startTimeout)
  (list "chromium-allow-file-access-from-files" .Values.chromium.allowFileAccessFromFiles)
  (list "chromium-allow-insecure-localhost" .Values.chromium.allowInsecureLocalhost)
  (list "chromium-allow-list" .Values.chromium.allowList)
  (list "chromium-deny-list" .Values.chromium.denyList)
  (list "chromium-deny-private-ips" .Values.chromium.denyPrivateIps)
  (list "chromium-deny-public-ips" .Values.chromium.denyPublicIps)
  (list "chromium-ignore-certificate-errors" .Values.chromium.ignoreCertificateErrors)
  (list "chromium-disable-web-security" .Values.chromium.disableWebSecurity)
  (list "chromium-host-resolver-rules" .Values.chromium.hostResolverRules)
  (list "chromium-proxy-server" .Values.chromium.proxyServer)
  (list "chromium-enable-environment-proxy" .Values.chromium.enableEnvironmentProxy)
  (list "chromium-disable-javascript" .Values.chromium.disableJavaScript)
  (list "chromium-disable-routes" .Values.chromium.disableRoutes)
  (list "chromium-shared-browser-context" .Values.chromium.sharedBrowserContext)
  (list "chromium-clear-cache" .Values.chromium.clearCache)
  (list "chromium-clear-cookies" .Values.chromium.clearCookies)
  (list "chromium-clear-storage" .Values.chromium.clearStorage)
  (list "chromium-max-queue-size" .Values.chromium.maxQueueSize)
  (list "chromium-max-concurrency" .Values.chromium.maxConcurrency)
  (list "chromium-idle-shutdown-timeout" .Values.chromium.idleShutdownTimeout)
  (list "chromium-max-memory" .Values.chromium.maxMemory)
  (list "chromium-debug-protocol" .Values.chromium.debugProtocol)
  (list "libreoffice-restart-after" .Values.libreOffice.restartAfter)
  (list "libreoffice-auto-start" .Values.libreOffice.autoStart)
  (list "libreoffice-start-timeout" .Values.libreOffice.startTimeout)
  (list "libreoffice-disable-routes" .Values.libreOffice.disableRoutes)
  (list "libreoffice-max-queue-size" .Values.libreOffice.maxQueueSize)
  (list "libreoffice-idle-shutdown-timeout" .Values.libreOffice.idleShutdownTimeout)
  (list "libreoffice-allow-list" .Values.libreOffice.allowList)
  (list "libreoffice-deny-list" .Values.libreOffice.denyList)
  (list "libreoffice-deny-private-ips" .Values.libreOffice.denyPrivateIps)
  (list "libreoffice-deny-public-ips" .Values.libreOffice.denyPublicIps)
  (list "libreoffice-enable-environment-proxy" .Values.libreOffice.enableEnvironmentProxy)
  (list "libreoffice-max-memory" .Values.libreOffice.maxMemory)
  (list "libreoffice-enable-macros" .Values.libreOffice.enableMacros)
  (list "pdf-max-concurrency" .Values.pdf.maxConcurrency)
  (list "pdf-disable-routes" .Values.pdf.disableRoutes)
  (list "pdf-disable-stages" .Values.pdf.disableStages)
  (list "pdf-max-stream-bytes" .Values.pdf.maxStreamBytes)
  (list "pdf-max-embedded-file-bytes" .Values.pdf.maxEmbeddedFileBytes)
  (list "pdf-max-image-pixels" .Values.pdf.maxImagePixels)
  (list "pdf-max-render-pixels" .Values.pdf.maxRenderPixels)
  (list "pdf-allow-list" .Values.pdf.allowList)
  (list "pdf-deny-list" .Values.pdf.denyList)
  (list "pdf-deny-private-ips" .Values.pdf.denyPrivateIps)
  (list "pdf-deny-public-ips" .Values.pdf.denyPublicIps)
  (list "pdf-enable-environment-proxy" .Values.pdf.enableEnvironmentProxy)
  (list "webhook-enable-sync-mode" .Values.webhook.enableSyncMode)
  (list "webhook-allow-list" .Values.webhook.allowList)
  (list "webhook-deny-list" .Values.webhook.denyList)
  (list "webhook-deny-private-ips" .Values.webhook.denyPrivateIps)
  (list "webhook-deny-public-ips" .Values.webhook.denyPublicIps)
  (list "webhook-max-retry" .Values.webhook.maxRetry)
  (list "webhook-retry-min-wait" .Values.webhook.retryMinWait)
  (list "webhook-retry-max-wait" .Values.webhook.retryMaxWait)
  (list "webhook-client-timeout" .Values.webhook.clientTimeout)
  (list "webhook-enable-environment-proxy" .Values.webhook.enableEnvironmentProxy)
  (list "webhook-disable" .Values.webhook.disable)
  (list "log-std-format" .Values.logging.stdFormat)
  (list "log-std-level-case" .Values.logging.stdLevelCase)
  (list "log-level" .Values.logging.level)
  (list "log-fields-prefix" .Values.logging.fieldsPrefix)
  (list "log-std-enable-gcp-fields" .Values.logging.stdEnableGcpFields)
  (list "gotenberg-hide-banner" .Values.gotenberg.hideBanner)
  (list "gotenberg-build-debug-data" .Values.gotenberg.buildDebugData)
}}
{{- include "gotenberg.flag" . }}
{{- end }}
{{- end }}

{{- define "gotenberg.flag" -}}
{{- $name := index . 0 }}
{{- $value := index . 1 }}
{{- if kindIs "slice" $value }}
{{- range $value }}
- {{ printf "--%s=%s" $name (include "gotenberg.csvField" .) | toJson }}
{{- else }}
- {{ printf "--%s=" $name | toJson }}
{{- end }}
{{- else if not (kindIs "invalid" $value) }}
{{- if or (kindIs "float64" $value) (kindIs "int64" $value) (kindIs "int" $value) }}
- {{ printf "--%s=%d" $name (int64 $value) | toJson }}
{{- else }}
- {{ printf "--%s=%v" $name $value | toJson }}
{{- end }}
{{- end }}
{{- end }}

{{/*
The helm test image. With testImage.tag and testImage.digest unset, the chart's
pin; .github/scripts/check-pinned-tools.js keeps it current.
*/}}
{{- define "gotenberg.testImage" -}}
{{- $pinnedTag := "1.38.0" }}
{{- $pinnedDigest := "sha256:a46257e06c82ad85242d0d38077d0a52d9896389ca60a1a59d3463db586e5fa4" }}
{{- $image := .Values.testImage }}
{{- $tag := ternary $pinnedTag $image.tag (kindIs "invalid" $image.tag) }}
{{- $digest := "" }}
{{- if not (kindIs "invalid" $image.digest) }}
{{- $digest = $image.digest }}
{{- else if kindIs "invalid" $image.tag }}
{{- $digest = $pinnedDigest }}
{{- end }}
{{- printf "%s:%s" $image.repository $tag }}{{ with $digest }}@{{ . }}{{ end }}
{{- end }}
