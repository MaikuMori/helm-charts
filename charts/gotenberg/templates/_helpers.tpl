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
helm.sh/chart: {{ include "gotenberg.chart" . }}
app.kubernetes.io/name: {{ include "gotenberg.name" . | trunc 58 | trimSuffix "-" }}-test
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
On OpenShift, the user and non-root check are left to the SCC, since the image's user isn't numeric.
The seccomp profile is left to the pod when podSecurityContext sets one.
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
{{- if not .Values.podSecurityContext.seccompProfile }}
seccompProfile:
  type: RuntimeDefault
{{- end }}
# Issue with Chromium, see: https://github.com/gotenberg/gotenberg/issues/949
readOnlyRootFilesystem: false
{{- end }}
{{- end }}
