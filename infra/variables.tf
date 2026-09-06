variable "aws_region" {
  description = "Default AWS region for resources that aren't region-pinned (e.g. ACM for CloudFront, which always needs us-east-1 separately)."
  type        = string
  default     = "us-east-1"
}

variable "github_repository" {
  description = "GitHub repo (owner/name) trusted to assume CI roles via OIDC."
  type        = string
  default     = "vinzievillamor/lazyspender"
}

variable "frontend_domain_name" {
  description = "Custom domain the frontend CloudFront distribution serves."
  type        = string
  default     = "lazyspender.zirchel.com"
}
