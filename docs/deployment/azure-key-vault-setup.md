# Azure Key Vault Setup

One-time bootstrap for the AskAmika production deployment. Run from a shell with the Azure CLI signed in to the target subscription.

## 1. Create the Key Vault

```bash
az group create --name AskAmikaRG --location westus2

az keyvault create \
  --name AskAmikaKV \
  --resource-group AskAmikaRG \
  --enable-rbac-authorization true
```

## 2. Add secrets

```bash
az keyvault secret set --vault-name AskAmikaKV --name ANTHROPIC-API-KEY --value "<key>"
az keyvault secret set --vault-name AskAmikaKV --name OPENAI-API-KEY    --value "<key>"

# When the integrations ship:
# az keyvault secret set --vault-name AskAmikaKV --name GOOGLE-API-KEY --value "<key>"
# az keyvault secret set --vault-name AskAmikaKV --name XAI-API-KEY    --value "<key>"
# az keyvault secret set --vault-name AskAmikaKV --name COSMOS-KEY     --value "<key>"
```

## 3. Grant the Container App's managed identity read access

```bash
PRINCIPAL_ID=$(az containerapp identity assign \
  --name askamika \
  --resource-group AskAmikaRG \
  --system-assigned \
  --query principalId -o tsv)

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Key Vault Secrets User" \
  --scope "$(az keyvault show --name AskAmikaKV --query id -o tsv)"
```

## 4. Map secrets into Container App environment variables

```bash
az containerapp secret set \
  --name askamika \
  --resource-group AskAmikaRG \
  --secrets \
    anthropic-api-key=keyvaultref:https://AskAmikaKV.vault.azure.net/secrets/ANTHROPIC-API-KEY,identityref:system \
    openai-api-key=keyvaultref:https://AskAmikaKV.vault.azure.net/secrets/OPENAI-API-KEY,identityref:system

az containerapp update \
  --name askamika \
  --resource-group AskAmikaRG \
  --set-env-vars \
    ANTHROPIC_API_KEY=secretref:anthropic-api-key \
    OPENAI_API_KEY=secretref:openai-api-key
```

## 5. GitHub Actions OIDC federation (one-time)

The workflow at `.github/workflows/deploy.yml` uses workload-identity federation. Provision a service principal and federate it to the repo:

```bash
APP_ID=$(az ad app create --display-name askamika-github --query appId -o tsv)
az ad sp create --id "$APP_ID"

az role assignment create \
  --assignee "$APP_ID" \
  --role "Contributor" \
  --scope "/subscriptions/<sub-id>/resourceGroups/AskAmikaRG"

az ad app federated-credential create --id "$APP_ID" --parameters '{
  "name": "askamika-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:<org>/<repo>:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

Then set these GitHub repo secrets:
- `AZURE_CLIENT_ID` = `$APP_ID`
- `AZURE_TENANT_ID` = `az account show --query tenantId -o tsv`
- `AZURE_SUBSCRIPTION_ID` = `az account show --query id -o tsv`

## Notes

- Never commit secrets to the repo. `.env*` is git-ignored except for `.env.example`.
- For local dev, populate `.env.local` from the same Key Vault secrets.
- Rotation: change the Key Vault secret only — the Container App resolves at startup, so a `containerapp restart` picks up the new value.
