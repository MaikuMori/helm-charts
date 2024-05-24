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
Return true if the detected platform is Openshift
Usage:
{{- include "gotenberg.compatibility.isOpenshift" . -}}
*/}}
{{- define "gotenberg.compatibility.isOpenshift" -}}
{{- if .Capabilities.APIVersions.Has "security.openshift.io/v1" -}}
{{- true -}}
{{- end -}}
{{- end -}}

{{/*
Render a compatible securityContext depending on the platform. By default it is maintained as it is. In other platforms like Openshift we remove default user/group values that do not work out of the box with the restricted-v1 SCC
Usage:
{{- include "gotenberg.compatibility.renderSecurityContext" (dict "secContext" .Values.containerSecurityContext "context" $) -}}
*/}}
{{- define "gotenberg.compatibility.renderSecurityContext" -}}
{{- $adaptedContext := .secContext -}}

{{- if (((.context.Values).compatibility).openshift) -}}
  {{- if or (eq .context.Values.compatibility.openshift.adaptSecurityContext "force") (and (eq .context.Values.compatibility.openshift.adaptSecurityContext "auto") (include "gotenberg.compatibility.isOpenshift" .context)) -}}
    {{/* Remove incompatible user/group values that do not work in Openshift out of the box */}}
    {{- $adaptedContext = omit $adaptedContext "fsGroup" "runAsUser" "runAsGroup" -}}
    {{- if not .secContext.seLinuxOptions -}}
    {{/* If it is an empty object, we remove it from the resulting context because it causes validation issues */}}
    {{- $adaptedContext = omit $adaptedContext "seLinuxOptions" -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- omit $adaptedContext "enabled" | toYaml -}}
{{- end -}}
