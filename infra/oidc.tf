# Shared GitHub Actions OIDC trust for all AWS CI roles in this project
# (this piece's frontend-deploy role today, the Lambda migration's deploy
# role later) — one provider, mirrors the existing GCP WIF pool.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1", # DigiCert (legacy intermediate)
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd", # GitHub's current root CA
  ]
}
