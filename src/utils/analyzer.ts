import {
  PrimaryTopic,
  PRIMARY_TOPICS,
  Difficulty,
  QuestionType,
  ExperienceLevel,
  InterviewRound,
  QuestionRecord,
  AnalysisSummary,
  ValidationReportItem,
} from '../types';

// Clean raw input lines
export function cleanRawText(rawText: string): string[] {
  if (!rawText) return [];

  // Standardize line breaks
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Split into candidate lines or paragraphs
  const rawLines = normalized.split('\n');
  const cleanedQuestions: string[] = [];

  let currentQuestion = '';

  for (let line of rawLines) {
    line = line.trim();
    if (!line) {
      if (currentQuestion) {
        cleanedQuestions.push(finalizeQuestionString(currentQuestion));
        currentQuestion = '';
      }
      continue;
    }

    // Check if line looks like a new question header:
    // e.g., "1.", "Q1:", "Question 2 -", "12)", "•", "-", "*", "[1]"
    const isNewQuestionPattern =
      /^(\d+[\.\)\-:]|\bQ(?:uestion)?\s*\d*[\.:\-]|[\u2022\u25E6\u2043\u2219\*\-])\s*/i.test(line);

    // If it starts with question markers or currentQuestion was empty
    if (isNewQuestionPattern || !currentQuestion) {
      if (currentQuestion) {
        cleanedQuestions.push(finalizeQuestionString(currentQuestion));
      }
      // Strip leading question markers
      const stripped = line.replace(
        /^(\d+[\.\)\-:]|\bQ(?:uestion)?\s*\d*[\.:\-]|[\u2022\u25E6\u2043\u2219\*\-])\s*/i,
        ''
      );
      currentQuestion = stripped;
    } else {
      // Continuation of previous question or multi-line question
      currentQuestion += ' ' + line;
    }
  }

  if (currentQuestion) {
    cleanedQuestions.push(finalizeQuestionString(currentQuestion));
  }

  return cleanedQuestions.filter((q) => q.length > 5);
}

function finalizeQuestionString(str: string): string {
  let res = str
    .replace(/\s+/g, ' ') // Collapse spaces
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

  // Remove leading leftover numbering e.g. "1.1 " or "1) "
  res = res.replace(/^\d+[\.\)\-:]\s*/, '');
  
  // OCR fixes for common mistakes
  res = res
    .replace(/\bK8s\b/g, 'Kubernetes')
    .replace(/\bCI\s*\/\s*CD\b/gi, 'CI/CD')
    .replace(/\bdevops\b/gi, 'DevOps')
    .replace(/\baws\b/gi, 'AWS')
    .replace(/\bgcp\b/gi, 'GCP')
    .replace(/\bdocker\s*file\b/gi, 'Dockerfile')
    .replace(/\bterraform\b/gi, 'Terraform')
    .replace(/\bansible\b/gi, 'Ansible')
    .replace(/\bprometheus\b/gi, 'Prometheus')
    .replace(/\bgrafana\b/gi, 'Grafana');

  return res;
}

// Compute string similarity for duplicate detection (Jaccard similarity on tokens)
export function computeSimilarity(str1: string, str2: string): number {
  const cleanTokens = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

  const tokens1 = new Set(cleanTokens(str1));
  const tokens2 = new Set(cleanTokens(str2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  tokens1.forEach((token) => {
    if (tokens2.has(token)) intersection++;
  });

  const union = new Set([...tokens1, ...tokens2]).size;
  return union === 0 ? 0 : intersection / union;
}

// Heuristic 20+ yr DevOps interviewer classifier
export function analyzeQuestionRuleBased(
  rawText: string,
  index: number
): Omit<QuestionRecord, 'id' | 'created_at' | 'updated_at' | 'status'> {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  let primaryTopic: PrimaryTopic = 'Others';
  const crossTopicsSet = new Set<string>();

  // Keyword rules prioritizing dominant topic
  if (/\b(helm|helm chart|values\.yaml|tiller)\b/.test(lower)) {
    primaryTopic = 'Helm';
    crossTopicsSet.add('Kubernetes');
  } else if (/\b(openshift|oc cli|s2i|routes\.route\.openshift)\b/.test(lower)) {
    primaryTopic = 'OpenShift';
    crossTopicsSet.add('Kubernetes');
  } else if (
    /\b(kubernetes|k8s|pod|pods|ingress|daemonset|statefulset|crd|etcd|kubelet|kube-proxy|cluster autoscaler|hpa|vpa|taint|toleration|calico|cilium|kube-apiserver)\b/.test(
      lower
    )
  ) {
    primaryTopic = 'Kubernetes';
    if (/network|dns|cni|calico|cilium|ingress/.test(lower)) crossTopicsSet.add('Networking');
    if (/security|rbac|podsecuritypolicy|pss|admission/.test(lower)) crossTopicsSet.add('Security');
    if (/volume|pvc|pv|storageclass/.test(lower)) crossTopicsSet.add('Storage');
    if (/docker|container/.test(lower)) crossTopicsSet.add('Docker');
  } else if (/\b(terraform|terragrunt|tfstate|hcl|provider block|backend "s3")\b/.test(lower)) {
    primaryTopic = 'Terraform';
    if (/aws|s3|ec2|vpc/.test(lower)) crossTopicsSet.add('AWS');
    if (/azure|arm|bicep/.test(lower)) crossTopicsSet.add('Azure');
    if (/gcp|google/.test(lower)) crossTopicsSet.add('GCP');
    if (/state|locking|dynamodb/.test(lower)) crossTopicsSet.add('Storage');
    crossTopicsSet.add('Automation');
  } else if (/\b(ansible|playbook|roles|inventory|ansible galaxy|idempotenc)/.test(lower)) {
    primaryTopic = 'Ansible';
    crossTopicsSet.add('Automation');
    if (/linux|ssh|sudo/.test(lower)) crossTopicsSet.add('Linux');
  } else if (/\b(podman|buildah|skopeo)\b/.test(lower)) {
    primaryTopic = 'Podman';
    crossTopicsSet.add('Linux');
  } else if (/\b(containerd|runc|cri-o)\b/.test(lower)) {
    primaryTopic = 'Containerd';
    crossTopicsSet.add('Linux');
  } else if (
    /\b(docker|dockerfile|docker-compose|bind mount|docker volume|cgroup|namespace|overlay2|multistage build)\b/.test(
      lower
    )
  ) {
    primaryTopic = 'Docker';
    if (/linux|cgroup|namespace/.test(lower)) crossTopicsSet.add('Linux');
    if (/network|bridge|macvlan/.test(lower)) crossTopicsSet.add('Networking');
    if (/volume|storage|bind/.test(lower)) crossTopicsSet.add('Storage');
    if (/security|rootless/.test(lower)) crossTopicsSet.add('Security');
  } else if (/\b(jenkins|jenkinsfile|pipeline as code|blue ocean|shared library)\b/.test(lower)) {
    primaryTopic = 'Jenkins';
    crossTopicsSet.add('CI/CD');
  } else if (
    /\b(ci\/cd|pipeline|gitlab-ci|github actions|argo cd|flux cd|tekton|deployment strategy|canary|blue green)\b/.test(
      lower
    )
  ) {
    primaryTopic = 'CI/CD';
    if (/github/.test(lower)) crossTopicsSet.add('GitHub');
    if (/git/.test(lower)) crossTopicsSet.add('Git');
    if (/kubernetes|argo/.test(lower)) crossTopicsSet.add('Kubernetes');
  } else if (/\b(github|pull request|github actions|dependabot)\b/.test(lower)) {
    primaryTopic = 'GitHub';
    crossTopicsSet.add('Git');
    crossTopicsSet.add('CI/CD');
  } else if (/\b(git|rebase|merge conflict|cherry-pick|git bisect|reflog|stash|commit)\b/.test(lower)) {
    primaryTopic = 'Git';
  } else if (
    /\b(aws|ec2|s3|vpc|iam|lambda|fargate|eks|route53|cloudformation|elastic load balancer|alb|nlb|ebs|efs)\b/.test(
      lower
    )
  ) {
    primaryTopic = 'AWS';
    if (/iam|role|policy|kms/.test(lower)) crossTopicsSet.add('IAM');
    if (/vpc|route53|subnet|gateway|nat/.test(lower)) crossTopicsSet.add('Networking');
    if (/eks/.test(lower)) crossTopicsSet.add('Kubernetes');
    if (/s3|ebs|efs/.test(lower)) crossTopicsSet.add('Storage');
  } else if (/\b(azure|aks|blob storage|azure devops|entra id|vnet|arm template|app service)\b/.test(lower)) {
    primaryTopic = 'Azure';
    if (/aks/.test(lower)) crossTopicsSet.add('Kubernetes');
    if (/vnet|traffic manager/.test(lower)) crossTopicsSet.add('Networking');
  } else if (/\b(gcp|google cloud|gke|cloud run|bigquery|cloud storage|gce|vpc peering)\b/.test(lower)) {
    primaryTopic = 'GCP';
    if (/gke/.test(lower)) crossTopicsSet.add('Kubernetes');
  } else if (/\b(oci|oracle cloud)\b/.test(lower)) {
    primaryTopic = 'OCI';
  } else if (/\b(promql|prometheus|alertmanager|node_exporter|metrics scrape)\b/.test(lower)) {
    primaryTopic = 'Prometheus';
    crossTopicsSet.add('Monitoring');
    crossTopicsSet.add('Observability');
  } else if (/\b(grafana|dashboard|panels|loki|tempo)\b/.test(lower)) {
    primaryTopic = 'Grafana';
    crossTopicsSet.add('Monitoring');
    crossTopicsSet.add('Observability');
  } else if (/\b(cloudwatch|log group|cloudwatch metric)\b/.test(lower)) {
    primaryTopic = 'CloudWatch';
    crossTopicsSet.add('AWS');
    crossTopicsSet.add('Monitoring');
  } else if (
    /\b(observability|opentelemetry|distributed tracing|jaeger|zipkin|apm|slo|sli|sla|error budget)\b/.test(
      lower
    )
  ) {
    if (/slo|sli|sla|error budget|toil|blameless postmortem/.test(lower)) {
      primaryTopic = 'SRE';
    } else {
      primaryTopic = 'Observability';
    }
    crossTopicsSet.add('Monitoring');
  } else if (/\b(sre|site reliability|chaos engineering|gremlin|incident response|on-call)\b/.test(lower)) {
    primaryTopic = 'SRE';
    crossTopicsSet.add('Observability');
  } else if (/\b(platform engineering|internal developer platform|idp|backstage|backstage\.io)\b/.test(lower)) {
    primaryTopic = 'Platform Engineering';
    crossTopicsSet.add('Automation');
  } else if (
    /\b(dns|bind|nslookup|dig|cname|a record|soa|split horizon|ptr|resolver|resolv\.conf)\b/.test(lower)
  ) {
    primaryTopic = 'DNS';
    crossTopicsSet.add('Networking');
  } else if (
    /\b(networking|tcp|udp|ip|subnet|cidr|bgp|iptables|ebpf|load balancer|ssl|tls|cert-manager|http|https|proxy|reverse proxy|nginx|haproxy)\b/.test(
      lower
    )
  ) {
    primaryTopic = 'Networking';
    if (/linux/.test(lower)) crossTopicsSet.add('Linux');
    if (/ssl|tls|cert/.test(lower)) crossTopicsSet.add('Security');
  } else if (/\b(storage|nfs|efs|ebs|san|nas|iscsi|zfs|raid|lvm)\b/.test(lower)) {
    primaryTopic = 'Storage';
    if (/linux/.test(lower)) crossTopicsSet.add('Linux');
  } else if (/\b(iam|rbac|least privilege|oidc|saml|jwt|token|mfa|service account)\b/.test(lower)) {
    primaryTopic = 'IAM';
    crossTopicsSet.add('Security');
  } else if (
    /\b(devsecops|sast|dast|sonar|trivy|aqua|snyk|cve|vulnerability|secrets management|hashicorp vault)\b/.test(
      lower
    )
  ) {
    primaryTopic = 'DevSecOps';
    crossTopicsSet.add('Security');
  } else if (/\b(security|firewall|waf|ddos|encryption|kms|hardening|selinux|apparmor)\b/.test(lower)) {
    primaryTopic = 'Security';
    if (/linux/.test(lower)) crossTopicsSet.add('Linux');
  } else if (
    /\b(database|postgres|postgresql|mysql|mongodb|redis|kafka|rabbitmq|sharding|replication|wal|failover)\b/.test(
      lower
    )
  ) {
    primaryTopic = 'Database';
  } else if (
    /\b(python|boto3|fastapi|flask|pytest|pandas|virtualenv|generator|decorator|list comprehension)\b/.test(
      lower
    )
  ) {
    primaryTopic = 'Python';
    crossTopicsSet.add('Automation');
  } else if (/\b(bash|shell|awk|sed|grep|xargs|chmod|chown|crontab|shebang|pipefail)\b/.test(lower)) {
    if (/bash|awk|sed|grep|shebang|script/.test(lower)) {
      primaryTopic = 'Shell Scripting';
      crossTopicsSet.add('Linux');
    } else {
      primaryTopic = 'Linux';
    }
  } else if (
    /\b(linux|kernel|systemd|journalctl|dmesg|top|htop|iostat|vmstat|sar|inode|strace|lsof|procfs|sysfs)\b/.test(
      lower
    )
  ) {
    primaryTopic = 'Linux';
    if (/network/.test(lower)) crossTopicsSet.add('Networking');
  } else if (/\b(architecture|disaster recovery|high availability|multi-region|active-active|failover)\b/.test(lower)) {
    primaryTopic = 'Architecture';
  } else if (/\b(automation|scripting|cron|webhook)\b/.test(lower)) {
    primaryTopic = 'Automation';
  }

  // Ensure primaryTopic is valid
  if (!PRIMARY_TOPICS.includes(primaryTopic)) {
    primaryTopic = 'Others';
  }

  // Determine Question Type
  let questionType: QuestionType = 'Theory';
  if (
    /troubleshoot|debug|fix|crash|failing|error|exit code 137|oomkilled|pending pod|502 bad gateway|high load average|incident|cpu spike|latency/i.test(
      lower
    )
  ) {
    if (/incident|p1|outage|sev-1|postmortem/i.test(lower)) {
      questionType = 'Production Incident';
    } else {
      questionType = 'Troubleshooting';
    }
  } else if (/architecture|design a|architect|scale to|millions|multi-tenant|disaster recovery/i.test(lower)) {
    questionType = 'Architecture';
  } else if (/scenario|suppose|imagine|how would you handle|if your/i.test(lower)) {
    questionType = 'Scenario';
  } else if (/write a (script|program|function|command|pipeline)|code|python function|regex/i.test(lower)) {
    questionType = 'Coding';
  } else if (/how do you configure|steps to set up|hands on|command to/i.test(lower)) {
    questionType = 'Hands-on';
  } else if (/in your current project|real time|in your experience|have you implemented/i.test(lower)) {
    questionType = 'Real-time Experience';
  } else {
    questionType = 'Theory';
  }

  // Determine Difficulty
  let difficulty: Difficulty = 'Intermediate';
  let experienceLevel: ExperienceLevel = '4-6 Years';
  let interviewRound: InterviewRound = 'L2';

  if (
    /what is|define|difference between|basic commands|list commands|how to install|syntax of|what does/i.test(
      lower
    ) &&
    !/scale|large scale|internals|kernel|etcd quorum|split-brain/i.test(lower)
  ) {
    difficulty = 'Beginner';
    experienceLevel = '0-2 Years';
    interviewRound = 'L1';
  } else if (
    /architecture|trade-offs|internals|ebpf|kernel panic|high scale|zero downtime|multi-region active-active|disaster recovery|distributed consensus|chaos/i.test(
      lower
    ) ||
    questionType === 'Architecture' ||
    questionType === 'Production Incident'
  ) {
    difficulty = 'Expert';
    experienceLevel = '8-12 Years';
    interviewRound = 'Architect';
  } else if (
    /production|optimize|performance tuning|troubleshoot|deep dive|cgroup|ingress controller|state locking|hardened/i.test(
      lower
    ) ||
    questionType === 'Troubleshooting'
  ) {
    difficulty = 'Advanced';
    experienceLevel = '6-8 Years';
    interviewRound = 'L3';
  } else {
    difficulty = 'Intermediate';
    experienceLevel = '2-4 Years';
    interviewRound = 'L2';
  }

  // Generate Tags
  const extractedTags: string[] = [];
  const addTag = (t: string) => {
    const cleaned = t.toLowerCase().trim();
    if (cleaned && !extractedTags.includes(cleaned)) extractedTags.push(cleaned);
  };

  addTag(primaryTopic.toLowerCase());
  crossTopicsSet.forEach((ct) => addTag(ct.toLowerCase()));

  const tagCandidates = [
    'kubernetes',
    'docker',
    'terraform',
    'ansible',
    'helm',
    'aws',
    'azure',
    'gcp',
    'linux',
    'ci/cd',
    'git',
    'github',
    'prometheus',
    'grafana',
    'devsecops',
    'iam',
    'pod',
    'ingress',
    'cni',
    'ebpf',
    'statefulset',
    'daemonset',
    'pv',
    'pvc',
    'hpa',
    'troubleshooting',
    'production',
    'architecture',
    'security',
    'dns',
    'ssl/tls',
    'bash',
    'python',
    'sre',
    'slo',
    'sli',
  ];

  tagCandidates.forEach((c) => {
    if (lower.includes(c)) addTag(c);
  });

  // Generate Explanation (<50 words)
  let explanation = '';
  if (primaryTopic === 'Kubernetes') {
    explanation =
      'Focuses on Kubernetes cluster primitives, orchestration lifecycle, or control plane mechanics evaluated in cloud-native infrastructure rounds.';
  } else if (primaryTopic === 'Docker') {
    explanation =
      'Tests container virtualization, OCI image construction, storage mounts, or namespace isolation core to modern containerized workflows.';
  } else if (primaryTopic === 'Terraform') {
    explanation =
      'Probes Infrastructure as Code declarative provisioning, state governance, dependency graphs, and multi-cloud automation principles.';
  } else if (primaryTopic === 'Linux') {
    explanation =
      'Tests fundamental operating system operations, process scheduling, memory subsystems, and kernel diagnostics essential for SRE roles.';
  } else if (primaryTopic === 'AWS') {
    explanation =
      'Evaluates architecture, managed cloud services, resilience boundaries, and security patterns within Amazon Web Services.';
  } else if (primaryTopic === 'CI/CD') {
    explanation =
      'Examines automated build-test-deploy pipelines, release gating, progressive delivery strategies, and artifact management.';
  } else if (primaryTopic === 'Networking') {
    explanation =
      'Probes packet routing, DNS resolution, ingress proxies, TLS handshakes, and transport layer latency diagnostics.';
  } else if (primaryTopic === 'SRE') {
    explanation =
      'Assesses reliability engineering metrics (SLO/SLI), error budgeting, blameless incident mitigation, and toil reduction.';
  } else {
    explanation = `Evaluates core ${primaryTopic} competency, real-world operational trade-offs, and technical implementation patterns.`;
  }

  // Search Keywords
  const searchKeywords = Array.from(
    new Set([
      primaryTopic.toLowerCase(),
      ...Array.from(crossTopicsSet).map((c) => c.toLowerCase()),
      ...extractedTags,
      questionType.toLowerCase(),
      difficulty.toLowerCase(),
    ])
  );

  // Confidence Score (0-100)
  let confidenceScore = 92;
  if (primaryTopic === 'Others') {
    confidenceScore = 65; // <75 will highlight row in yellow
  } else if (text.length < 20) {
    confidenceScore = 70;
  } else if (crossTopicsSet.size > 3) {
    confidenceScore = 80;
  }

  return {
    sl_no: index + 1,
    question: text,
    primary_topic: primaryTopic,
    cross_topics: Array.from(crossTopicsSet),
    difficulty,
    question_type: questionType,
    experience_level: experienceLevel,
    interview_round: interviewRound,
    tags: extractedTags,
    search_keywords: searchKeywords,
    confidence_score: confidenceScore,
    explanation,
  };
}

// Full duplicate detector and batch analyzer
export function processQuestionsBatch(
  rawQuestions: string[],
  existingBank: QuestionRecord[] = []
): { questions: QuestionRecord[]; summary: AnalysisSummary; report: ValidationReportItem[] } {
  const analyzed: QuestionRecord[] = [];
  const now = new Date().toISOString();

  // First pass: Analyze each question
  rawQuestions.forEach((qStr, idx) => {
    const base = analyzeQuestionRuleBased(qStr, idx);
    const uuid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 10)}`;
    analyzed.push({
      ...base,
      id: uuid,
      duplicate_type: 'None',
      duplicate_group: undefined,
      status: 'Pending Review',
      created_at: now,
      updated_at: now,
    });
  });

  // Second pass: Duplicate detection across the batch and against existing bank
  let dupGroupCounter = 1;
  const allQuestionsForDupCheck = [...existingBank, ...analyzed];

  for (let i = 0; i < analyzed.length; i++) {
    const current = analyzed[i];
    let bestMatchIdx = -1;
    let highestSim = 0;

    for (let j = 0; j < allQuestionsForDupCheck.length; j++) {
      const candidate = allQuestionsForDupCheck[j];
      if (candidate.id === current.id) continue;

      // Exact check
      if (candidate.question.trim().toLowerCase() === current.question.trim().toLowerCase()) {
        highestSim = 1.0;
        bestMatchIdx = j;
        break;
      }

      // Jaccard similarity
      const sim = computeSimilarity(current.question, candidate.question);
      if (sim > highestSim && sim >= 0.7) {
        highestSim = sim;
        bestMatchIdx = j;
      }
    }

    if (highestSim >= 0.7 && bestMatchIdx >= 0) {
      const match = allQuestionsForDupCheck[bestMatchIdx];
      const assignedGroup = match.duplicate_group || `DUP-${String(dupGroupCounter++).padStart(2, '0')}`;
      match.duplicate_group = assignedGroup;
      current.duplicate_group = assignedGroup;

      if (highestSim >= 0.98) {
        current.duplicate_type = 'Exact';
      } else if (highestSim >= 0.85) {
        current.duplicate_type = 'Near';
      } else {
        current.duplicate_type = 'Rephrased';
      }

      // Slightly lower confidence on duplicates to invite review
      current.confidence_score = Math.min(current.confidence_score, 74);
    }
  }

  // Generate Validation Report
  const report: ValidationReportItem[] = [];
  analyzed.forEach((q) => {
    if (q.primary_topic === 'Others') {
      report.push({
        type: 'warning',
        questionId: q.id,
        field: 'primary_topic',
        message: 'Assigned to "Others". Review recommended to classify into a primary tech.',
      });
    }
    if (q.confidence_score < 75) {
      report.push({
        type: 'warning',
        questionId: q.id,
        field: 'confidence_score',
        message: `Confidence is ${q.confidence_score}% (<75%). Manual inspection suggested.`,
      });
    }
    if (q.duplicate_group) {
      report.push({
        type: 'info',
        questionId: q.id,
        field: 'duplicate_group',
        message: `Flagged as ${q.duplicate_type} duplicate in group ${q.duplicate_group}.`,
      });
    }
    if (q.explanation.split(/\s+/).length > 50) {
      report.push({
        type: 'warning',
        questionId: q.id,
        field: 'explanation',
        message: 'Explanation exceeds 50 words guideline.',
      });
    }
  });

  // Calculate Summary
  const uniqueTopics = new Set(analyzed.map((q) => q.primary_topic)).size;
  const duplicatesFound = analyzed.filter((q) => q.duplicate_group).length;
  const expertQuestions = analyzed.filter((q) => q.difficulty === 'Expert').length;
  const reviewRequired = analyzed.filter((q) => q.confidence_score < 75 || q.duplicate_group).length;
  const avgConf =
    analyzed.reduce((acc, curr) => acc + curr.confidence_score, 0) / (analyzed.length || 1);

  const summary: AnalysisSummary = {
    questionsProcessed: analyzed.length,
    duplicatesFound,
    topicsCount: uniqueTopics,
    expertQuestions,
    reviewRequired,
    averageConfidence: Math.round(avgConf),
  };

  return { questions: analyzed, summary, report };
}
