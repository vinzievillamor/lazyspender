provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "lazyspender"
      ManagedBy = "terraform"
    }
  }
}

# CloudFront requires ACM certificates in us-east-1 regardless of where the
# rest of the stack (this piece, or the future Lambda/Aurora pieces) lives.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = "lazyspender"
      ManagedBy = "terraform"
    }
  }
}
