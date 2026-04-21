{
  "Version": "2008-10-17",
  "Statement": [
    {
      "Sid": "ECR access",
      "Effect": "Allow",
      "Principal": 
      ${jsonencode({
        "AWS": [for i in rolearn : "${i}"],
      })}
      ,
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:DescribeImageScanFindings",
        "ecr:DescribeImages",
        "ecr:DescribeRepositories",
        "ecr:GetAuthorizationToken",
        "ecr:GetDownloadUrlForLayer",
        "ecr:GetLifecyclePolicy",
        "ecr:GetLifecyclePolicyPreview",
        "ecr:GetRepositoryPolicy",
        "ecr:ListImages",
        "ecr:ListTagsForResource"
      ]
    }
  ]
}

