# Rotate the Riot Development API key (expires every 24h by Riot's design).
# Get a fresh key from https://developer.riotgames.com/ first, then run:
#   .\infra\rotate-riot-key.ps1

$env:PATH += ";$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin"

$newKey = Read-Host "Pega la nueva Riot API key" -AsSecureString
$plainKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($newKey)
)

$tempFile = New-TemporaryFile
$plainKey | Out-File -FilePath $tempFile -NoNewline -Encoding ascii

gcloud secrets versions add loc-riot-api-key --data-file="$tempFile" --project=league-of-coach-prod
Remove-Item $tempFile

Write-Output "Nueva version del secret creada. Forzando una revision nueva en Cloud Run para que la recoja..."
gcloud run services update loc-backend `
  --region=us-central1 `
  --project=league-of-coach-prod `
  --update-secrets="RIOT_API_KEY=loc-riot-api-key:latest"

Write-Output "Listo. loc-backend ya esta corriendo con la key nueva."
