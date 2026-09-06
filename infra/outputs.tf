output "frontend_cloudfront_domain_name" {
  description = "Default *.cloudfront.net domain — verify the stack here before adding the custom domain CNAME."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "frontend_s3_bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}

output "frontend_deploy_role_arn" {
  description = "Put this in the GitHub repo as a variable/secret for frontend-web-deploy.yml's aws-actions/configure-aws-credentials step."
  value       = aws_iam_role.frontend_deploy.arn
}

output "frontend_acm_validation_records" {
  description = "Add these CNAME(s) at the domain registrar by hand (DNS stays outside Terraform/Route 53) — terraform apply will otherwise hang waiting for ACM validation."
  value = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}

output "frontend_domain_cname_target" {
  description = "After the cert validates, add a CNAME for the frontend domain pointing here at the registrar."
  value       = aws_cloudfront_distribution.frontend.domain_name
}
