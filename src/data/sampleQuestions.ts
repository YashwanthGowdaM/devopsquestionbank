export const SAMPLE_RAW_TEXT = `1. How does Kubernetes kube-proxy manage iptables vs IPVS mode, and what are the performance trade-offs at 5,000+ services?
2. What is the difference between Docker bind mount and volume?
3. What is the difference between Docker bind mount and volume?
4. Explain how Docker volume differs from a host bind mount in persistent container storage.

• In Terraform, how do you handle state locking using AWS S3 backend and DynamoDB table?
• Describe state locking mechanism in Terraform when using S3 and DynamoDB backend.
6) Troubleshoot a scenario where a pod is stuck in CrashLoopBackOff with Exit Code 137 in an EKS cluster.
7. What is an Inode in Linux and how do you resolve "No space left on device" when df -h shows 40% disk free?
Q8: How do you design a zero-downtime multi-region active-active disaster recovery architecture for a payment gateway?
9 - Write a Python script or shell one-liner using boto3 to find all unattached EBS volumes and create snapshots before deleting them.
10. How does Ansible achieve idempotency in playbooks, and what modules break idempotency?
11. How do you configure Prometheus alertmanager to group, inhibit, and route alerts to PagerDuty and Slack?
12. What is the difference between SLI, SLO, and SLA, and how do you calculate an error budget burn rate in SRE?
13. Explain DNS resolution flow when a client queries an internal service in Kubernetes with CoreDNS.
14. How do you prevent lateral movement in a Kubernetes cluster using Calico NetworkPolicies and Pod Security Standards?
15. What are the key differences between Git rebase and Git merge, and when should you avoid rebase?
16. How do you implement Canary deployments using Argo Rollouts and Istio service mesh in production?
17. What is the difference between horizontal pod autoscaler (HPA) and vertical pod autoscaler (VPA), and why shouldn't they target the same metric?
18. Troubleshoot high load average on a Linux node where CPU utilization is only 15% but iowait is 85%.
19. How do you configure IAM roles for service accounts (IRSA) in AWS EKS using OIDC provider?
20. What is a 502 Bad Gateway error in NGINX reverse proxy, and how do you identify upstream keepalive exhaustion?
`;

export const INITIAL_PRELOADED_BANK_TEXT = `1. What is the difference between Docker ENTRYPOINT and CMD?
2. How do you optimize Docker image size using multi-stage builds?
3. Explain the Linux boot process from BIOS/UEFI to systemd target.
4. How do you debug a slow SQL query in PostgreSQL running on AWS RDS?
5. What is the difference between soft link and hard link in Linux?
6. Describe the etcd raft consensus algorithm and how it maintains leader election during network partitions.
7. How do you securely inject secrets into a CI/CD pipeline using HashiCorp Vault?
8. Explain the difference between blue-green and rolling deployment strategies.
`;
