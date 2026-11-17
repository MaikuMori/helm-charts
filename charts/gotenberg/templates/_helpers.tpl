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

If .Values.securityContext is set, use it. Otherwise, use the defaults.

Defaults:
On OpenShift, the user, non-root check and seccomp profile are left to the SCC, since the image's
user isn't numeric and a pod that sets a seccomp profile can't be admitted under SCCs without
seccompProfiles, such as anyuid.
Elsewhere, the seccomp profile is left to the pod when podSecurityContext sets one.
And apply recommended settings from upstream project.
*/}}
{{- define "gotenberg.securityContext" -}}
{{- if .Values.securityContext }}
{{- toYaml .Values.securityContext }}
{{- else -}}
privileged: false
{{- if not (.Capabilities.APIVersions.Has "security.openshift.io/v1") }}
runAsUser: 1001
runAsNonRoot: true
{{- end }}
allowPrivilegeEscalation: false
capabilities:
  drop:
    - ALL
{{- if not (or .Values.podSecurityContext.seccompProfile (.Capabilities.APIVersions.Has "security.openshift.io/v1")) }}
seccompProfile:
  type: RuntimeDefault
{{- end }}
# Issue with Chromium, see: https://github.com/gotenberg/gotenberg/issues/949
readOnlyRootFilesystem: false
{{- end }}
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
