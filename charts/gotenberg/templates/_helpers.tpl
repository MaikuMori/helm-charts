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
If we detect OpenShift, we remove the "runAsUser", fsGroup, "runAsGroup" fields since they're not supported.
And apply recommended settings from upstream project.
*/}}
{{- define "gotenberg.securityContext" -}}
{{- if .Values.securityContext }}
{{- toYaml .Values.securityContext }}
{{- else}}
{{- if .Capabilities.APIVersions.Has "security.openshift.io/v1" -}}
privileged: false
allowPrivilegeEscalation: false
# Issue with Chromium, see: https://github.com/gotenberg/gotenberg/issues/949
readOnlyRootFilesystem: false
{{- else -}}
privileged: false
runAsUser: 1001
allowPrivilegeEscalation: false
# Issue with Chromium, see: https://github.com/gotenberg/gotenberg/issues/949
readOnlyRootFilesystem: false
{{- end}}
{{- end}}
{{- end}}

{{/*
Create a liveness probe context

If .Values.livenessProbe is set, use it. Otherwise, use the defaults.
*/}}
{{- define "gotenberg.livenessProbe" -}}
{{- if .Values.livenessProbe }}
{{- toYaml .Values.livenessProbe }}
{{- else -}}
httpGet:
  path: /health
  port: http
{{- end -}}
{{- end }}

{{/*
Create a readiness probe context

If .Values.readinessProbe is set, use it. Otherwise, use the defaults.
*/}}
{{- define "gotenberg.readinessProbe" -}}
{{- if .Values.readinessProbe }}
{{- toYaml .Values.readinessProbe }}
{{- else -}}
httpGet:
  path: /health
  port: http
{{- end -}}
{{- end }}
