# AWS IAM Question Bank

## A. IAM Basics

### A.1. Definition and Scope

**N1:**

* **Q1.** What is AWS IAM, in one sentence?
  **R1.** The service that securely controls who can access AWS and an account's resources, through identities and permission policies.

* **Q2.** Is IAM paid? Do you have to sign up for it?
  **R2.** No: you do not sign up specifically for IAM, and its use is not billed.

* **Q3.** Is IAM specific to a Region?
  **R3.** No. IAM resources are global: the same role can be used across all Regions.

* **Q4.** When do you use IAM?
  **R4.** With every access to the account: signing in, assuming a role, or calling an API goes through IAM, the foundation of identity-based access control.

* **Q5.** Who deals with IAM in an organization?
  **R5.** The service user (receives credentials and permissions from their administrator), the service administrator (decides which functions their users access and requests them), and the IAM administrator (manages identities and writes policies).

### A.2. Authentication and Authorization

**N1:**

* **Q6.** What is the difference between authentication and authorization?
  **R6.** Authentication: proving who you are. Authorization: deciding what the authenticated identity can do, by evaluating policies.

* **Q8.** How can you authenticate with AWS?
  **R8.** As the root user, an IAM user, or by assuming a role; you can also sign in as a federated identity (IAM Identity Center, single sign-on, Google or Facebook credentials).

**N2:**

* **Q7.** What are the steps for processing a request?
  **R7.** Three: authentication (if required), processing the request context, then evaluating all applicable policies.

* **Q9.** How do you authenticate programmatically?
  **R9.** The software development kit (SDK) and command-line interface (CLI) cryptographically sign requests (Signature Version 4).

**N3:**

* **Q10.** Are all requests authenticated?
  **R10.** No: some services, such as Amazon S3, accept anonymous requests; authentication only occurs "if required".

### A.3. Vocabulary

**N1:**

* **Q11.** What is a principal?
  **R11.** An entity that can perform actions and access resources: root user, IAM user, role (and its session), or AWS service.

* **Q13.** What are a resource, an action, and a condition?
  **R13.** Resource: the targeted object (bucket, queue…). Action: the API operation (s3:GetObject). Condition: a constraint on the context (MFA, IP address, tag…).

* **Q14.** What is an ARN?
  **R14.** The unique identifier of an AWS resource, with six fields: arn, partition, service, region, account, resource.

* **Q15.** What is a policy?
  **R15.** An object (JSON document) that, attached to an identity or a resource, defines its permissions.

* **Q16.** What is a session?
  **R16.** The period during which temporary credentials are valid; for a role, it is called a role session.

**N2:**

* **Q12.** IAM identity or IAM entity: what is the difference?
  **R12.** Identities are users, groups, and roles; entities are users and roles, those on which you can place a permissions boundary.

### A.4. Default Deny

**N1:**

* **Q17.** Why is everything denied by default?
  **R17.** It is a security principle: only an explicit authorization grants access. Anything not explicitly allowed is denied.

* **Q18.** What are the three possible decisions?
  **R18.** Implicit deny (by default), explicit allow (Allow), and explicit deny (Deny).

**N2:**

* **Q19.** Who escapes the default deny?
  **R19.** The account root user, who has full access. In an organization, however, SCPs and RCPs apply to it.

### A.5. Getting Started on an Account

**N1:**

* **Q20.** Where should you start on a new AWS account?
  **R20.** Protect the root user, plan human and workload access (IAM Identity Center or federation), create an administrative user, then aim for least privilege.

* **Q25.** What are the management account and a member account?
  **R25.** In AWS Organizations, the management account creates the organization; other accounts are members of it, optionally organized into organizational units (OUs).

* **Q26.** Where can you find examples and tutorials?
  **R26.** The documentation provides identity policy examples (reusable JSON templates) and tutorials, for example for cross-account access or tag-based access control.

**N2:**

* **Q21.** Which identity sources can you choose?
  **R21.** Either enable IAM Identity Center with AWS Organizations (users created in its directory), or federate an external identity provider with IAM Identity Center or directly with IAM.

* **Q22.** What is IAM Identity Center, and how does it differ from IAM?
  **R22.** Recommended service for centrally managing access to accounts: it creates IAM roles in each account and attaches the desired policies. IAM remains the authorization engine.

* **Q23.** What is a "permission set"?
  **R23.** A set of policies assigned to a user or group for an account: Identity Center creates the corresponding IAM roles and updates them if the permission set changes.

**N3:**

* **Q24.** What is account access manager?
  **R24.** An IAM feature that assigns existing IAM roles to Identity Center users and groups across accounts in the organization; usable with permission sets or on its own.

## B. Users, Groups, Roles, and Federation

### B.1. IAM Users

**N1:**

* **Q27.** What is an IAM user?
  **R27.** An identity with specific permissions for a single person or application, with long-term credentials.

* **Q28.** What credentials does an IAM user carry?
  **R28.** A console password, access keys (up to 2), and MFA devices (up to 8).

* **Q31.** Why does AWS discourage long-term credentials?
  **R31.** They remain valid until deleted. AWS recommends temporary credentials for both humans and workloads.

**N2:**

* **Q29.** How many IAM users can an account contain?
  **R29.** Up to 5,000; this quota cannot be increased.

* **Q30.** When should you create an IAM user instead of a role?
  **R30.** Only when federation is impossible: workload without a role (for example a WordPress plugin), third-party AWS client, CodeCommit, Keyspaces, emergency access.

* **Q32.** What is an emergency access user?
  **R32.** An IAM user planned in case the identity provider is unreachable: strictly controlled credentials and protected by MFA.

* **Q33.** How should you manage access keys properly?
  **R33.** Only create them when needed, rotate them based on "last used" information, and delete unused ones.

### B.2. IAM Groups

**N1:**

* **Q34.** What is an IAM group?
  **R34.** A collection of users to which policies are attached: all members inherit them.

* **Q35.** Can a group contain another group?
  **R35.** No: groups cannot be nested.

* **Q36.** Is a group a principal?
  **R36.** No. You cannot specify it in the Principal element of a policy.

* **Q37.** Can a user belong to multiple groups?
  **R37.** Yes, up to 10 groups.

* **Q38.** Is there a default group?
  **R38.** No: no group automatically contains all users.

**N2:**

* **Q39.** What are a user's effective permissions?
  **R39.** Their own policies plus those of their groups, then any caps (SCP, RCP, boundary, session).

* **Q40.** Can you set a permissions boundary on a group?
  **R40.** No: only on a user or a role.

### B.3. IAM Roles

**N1:**

* **Q41.** What is an IAM role?
  **R41.** An identity with permissions, designed to be assumed by anyone who needs it. With no password or standard access key, it provides temporary credentials.

* **Q42.** Who can assume a role?
  **R42.** An IAM user (same account or another), a role in the same account, a service principal (EC2, Lambda…), or an external user authenticated by a SAML 2.0 or OIDC provider.

* **Q43.** What are the two policies of a role?
  **R43.** The trust policy (who can assume it) and the permissions policy (what you can do once the role is assumed).

* **Q48.** How do you assume a role?
  **R48.** By switching roles in the console, or via a CLI or API call (for example AssumeRole).

* **Q49.** For what uses are roles helpful?
  **R49.** Federated access, temporary user permissions, cross-account access, cross-service access, applications on Amazon EC2.

**N2:**

* **Q44.** What is the trust policy?
  **R44.** A mandatory resource policy attached to the role that defines the principals allowed to assume it and under what conditions. A role has only one.

* **Q46.** What is a service role, and a service-linked role?
  **R46.** Service role: assumed by a service to act on your behalf, managed by an IAM administrator. Service-linked role: owned by the service; you can view its permissions but not modify them.

* **Q50.** What is role chaining?
  **R50.** Using one role to assume a second one. The session is then limited to 1 hour, regardless of the maximum duration configured on the roles.

* **Q51.** What is cross-account delegation?
  **R51.** Granting access to a resource you control to another account: you create a role in the owner account (trusting), assumed by users in the trusted account.

* **Q54.** How many roles per account?
  **R54.** 1,000 by default, 10,000 maximum.

* **Q55.** Can a role have a permissions boundary?
  **R55.** Yes, unless it is a service-linked role.

* **Q56.** What is a role session?
  **R56.** The "assumed role" state: the acting identity carries a session ARN (`assumed-role/role/session-name`) and temporary credentials.

* **Q57.** Does a user who assumes a role keep their own permissions?
  **R57.** No: they temporarily give them up to take on those of the role, then get them back when leaving it.

**N3:**

* **Q45.** Can you put a wildcard in the Principal of a trust policy?
  **R45.** Not inside an ARN: no wildcard character can be part of it.

* **Q47.** Can you delete a service-linked role?
  **R47.** Yes, but only after deleting the resources associated with it.

* **Q52.** What is the external ID (`ExternalId`) used for?
  **R52.** To strengthen the security of roles assumed across accounts that are not controlled by the same organization (for example a third-party vendor).

* **Q53.** What is the "confused deputy" problem?
  **R53.** A third party causes a service to act with your privileges. For roles assumed by third parties, the external ID is a mitigation; the documentation has a dedicated page for it.

* **Q58.** What prefixes do unique IAM IDs have?
  **R58.** `AIDA` user, `AGPA` group, `AROA` role, `ANPA` managed policy, `ASCA` server certificate.

### B.4. Federation and Centralized Management

**N1:**

* **Q59.** What is identity federation?
  **R59.** A trust relationship between an external identity provider (SAML 2.0, OIDC) and AWS: the user is assigned a role and receives temporary credentials.

**N2:**

* **Q60.** How do you give access to employees who already have a corporate directory?
  **R60.** Federate that identity provider with IAM Identity Center or with IAM. With IAM, you create a role with a trust policy and a permissions policy.

* **Q61.** What is the difference between RBAC and ABAC?
  **R61.** RBAC: permissions by job function, via IAM roles aligned with roles/jobs. ABAC: permissions based on attributes, that is, tags on resources, roles, and sessions.

* **Q62.** How do you choose between user, group, and role?
  **R62.** Organization human: federation or Identity Center. AWS workload: service role. Outside AWS: Roles Anywhere, SAML, or OIDC. Third-party tool: IAM user. Emergency: emergency user with MFA.

**N3:**

* **Q63.** What is IAM temporary delegation?
  **R63.** A feature that allows Amazon and AWS partners to request temporary, limited access to your account to perform specific tasks on your behalf.

## C. AWS STS and Temporary Credentials

### C.1. Principles

**N1:**

* **Q64.** What is AWS STS?
  **R64.** The service that issues temporary, limited-privilege credentials.

* **Q65.** Why use temporary credentials?
  **R65.** They expire automatically without manual rotation, and limit the impact of a leak to the duration of the session.

* **Q66.** What does a set of temporary credentials contain?
  **R66.** An access key ID (`AccessKeyId`), a secret key, a session token, and an expiration date.

* **Q67.** What happens upon expiration?
  **R67.** The credentials are no longer valid: you must perform another `AssumeRole` (or the original operation).

### C.2. Durations

**N1:**

* **Q68.** What is the default duration of a role session?
  **R68.** One hour; the minimum requested is 900 seconds (15 minutes).

**N2:**

* **Q69.** What maximum duration can be configured on a role?
  **R69.** Between 1 and 12 hours.

* **Q70.** What is the duration when chaining roles?
  **R70.** 1 hour maximum; requesting more causes the call to fail.

**N3:**

* **Q71.** What are the durations for `GetSessionToken` and `GetFederationToken`?
  **R71.** IAM user: from 15 minutes to 36 hours (12 h default). Root user: 1 hour.

* **Q72.** What is the STS request quota?
  **R72.** 600 per second, per account and per Region (default value).

### C.3. Operations

**N2:**

* **Q73.** What STS operations exist?
  **R73.** `AssumeRole`, `AssumeRoleWithSAML`, `AssumeRoleWithWebIdentity`, `GetFederationToken`, `GetSessionToken`, and `AssumeRoot`.

* **Q74.** When should you use `AssumeRoleWithSAML` or `AssumeRoleWithWebIdentity`?
  **R74.** The first for users of a SAML provider; the second for an OIDC token (web or mobile application, CI/CD pipeline).

* **Q78.** What is `GetCallerIdentity` used for?
  **R78.** To find out who you are. It requires no permissions.

**N3:**

* **Q75.** When should you use `GetSessionToken`?
  **R75.** For an IAM user to obtain temporary credentials with MFA for API access.

* **Q76.** What is `AssumeRoot`?
  **R76.** An operation that, from the management account or delegated IAM administrator, grants a session of at most 900 seconds on a member account for a privileged task.

* **Q77.** Can the root user call `AssumeRole`?
  **R77.** No: IAM user or role credentials are required.

* **Q79.** What can you do after `GetSessionToken`?
  **R79.** No IAM API without MFA information; on the STS side, only `AssumeRole` and `GetCallerIdentity`.

* **Q80.** Global or regional STS endpoint?
  **R80.** Both exist; a nearby endpoint reduces latency. `AssumeRoot` requires a regional endpoint.

### C.4. MFA, Session Policies, Tags

**N2:**

* **Q81.** How do you require MFA to assume a role?
  **R81.** In the trust policy, with a `Bool` condition on `aws:MultiFactorAuthPresent` set to `"true"`; the caller provides `SerialNumber` and `TokenCode`.

* **Q83.** What is a session policy?
  **R83.** A policy passed when creating the session to restrict it: effective rights are the intersection of this policy and the role's policies.

* **Q84.** What is `RoleSessionName` used for?
  **R84.** It names the session (2 to 64 characters) and appears in CloudTrail logs.

**N3:**

* **Q82.** Why can `aws:MultiFactorAuthPresent` be absent?
  **R82.** With long-term access keys used directly, the key is not in the request: the condition does not match.

* **Q85.** What is a transitive session tag?
  **R85.** A tag passed at assumption and propagated to all subsequent sessions in a role chain.

### C.5. Session Principals and Credential Sources

**N2:**

* **Q88.** How does an EC2 instance or Lambda function obtain its credentials?
  **R88.** AWS delivers the temporary credentials of the associated role to the compute resource; SDKs discover them automatically.

**N3:**

* **Q86.** What is the difference between a role's ARN and its session's ARN?
  **R86.** Role: `arn:aws:iam::ID:role/name`. Session: `arn:aws:sts::ID:assumed-role/name/session`. Resource policies behave differently depending on which one they specify.

* **Q87.** In a policy, should you specify the role or its session?
  **R87.** The documentation recommends specifying the role.

* **Q89.** How does a workload outside AWS obtain credentials?
  **R89.** Via IAM Roles Anywhere (X.509 certificate), SAML, or OIDC; depending on the case, ECS Anywhere, EKS Hybrid Nodes, or SSM Hybrid Activations.

## D. The Root User

### D.1. Understanding

**N1:**

* **Q90.** What is the root user?
  **R90.** The single identity created with the account, with full access to all services and resources. You sign in with the account email address and password.

* **Q91.** Why must it be protected?
  **R91.** Compromising it gives total control of the account, including billing.

* **Q94.** Which user should be used day-to-day?
  **R94.** An administrative or least-privileged user (for example in IAM Identity Center), not root: root, administrator, and emergency users have unnecessary powers for daily tasks.

**N2:**

* **Q92.** Can it be restricted by a policy?
  **R92.** Neither by an identity policy nor by a permissions boundary. However, in an organization, SCPs and RCPs apply to it.

**N3:**

* **Q93.** What is the difference between "root user" and `arn:aws:iam::ID:root`?
  **R93.** In a policy, this ARN refers to the entire account (delegation), not just the root user.

### D.2. Reserved Tasks

**N2:**

* **Q95.** For which tasks is root really needed?
  **R95.** Few: managing a standalone account (email, password, closure), activating IAM access to billing, GovCloud, Reserved Instance seller, KMS key recovery, MFA on an S3 bucket, bucket or SQS policy that denies everything.

* **Q96.** Where can you find the up-to-date list?
  **R96.** On the official "AWS account root user" page; it evolves, so recheck it before building a procedure.

### D.3. Protecting It

**N1:**

* **Q98.** Is MFA mandatory for root?
  **R98.** Yes for all account types, to be registered within 14 days of the first console sign-in attempt.

**N2:**

* **Q97.** Should you create root access keys?
  **R97.** No. For programmatic access, use `aws login` with root credentials (automatically rotated temporary credentials).

* **Q99.** How many MFA devices can be registered?
  **R99.** Up to 8; multiple are recommended.

* **Q100.** What types of MFA are possible?
  **R100.** FIDO security key, hardware TOTP token, virtual authenticator app.

* **Q101.** What are the rules for the root password?
  **R101.** 8 to 128 characters, at least three types among uppercase, lowercase, numbers, and symbols, different from the account name and email.

* **Q102.** Why use a group email address?
  **R102.** So the account remains reachable if someone is absent or leaves.

* **Q103.** What is multi-person approval?
  **R103.** Ensuring no single person holds both the password and MFA: for example two groups of administrators.

**N3:**

* **Q104.** Why protect recovery mechanisms?
  **R104.** The registered email address and phone number allow account recovery: control over them should not rest on a single person.

* **Q105.** How do you monitor root usage?
  **R105.** Alerts on sign-ins and usage (EventBridge or CloudWatch with SNS, GuardDuty), AWS Config checks, Security Hub CSPM, Trusted Advisor.

### D.4. Root and AWS Organizations

**N2:**

* **Q106.** How do you manage root across multiple accounts?
  **R106.** Mandatory MFA for the management account; for member accounts, centralize root access and delete credentials, with an SCP in addition.

**N3:**

* **Q107.** Do new accounts in an organization have root credentials?
  **R107.** No, none by default.

* **Q108.** What does centralized root access enable?
  **R108.** Performing privileged tasks via `sts:AssumeRoot`: deleting root credentials, enabling password recovery, removing an S3 or SQS policy that denies everything.

## E. JSON Policies

### E.1. Policy Structure

**N1:**

* **Q109.** What is a JSON policy?
  **R109.** A JSON document composed of one or more statements (`Statement`) that describe permissions.

* **Q110.** What elements make up a statement?
  **R110.** `Sid` (optional), `Effect`, `Principal` (depending on policy type), `Action`, `Resource`, and `Condition` (optional).

* **Q113.** What happens when two statements contradict each other?
  **R113.** An applicable `Deny` always overrides an `Allow`.

**N2:**

* **Q111.** What is `Version` used for, and which value should you use?
  **R111.** To indicate the syntax version: use `2012-10-17`. Without this element, it defaults to `2008-10-17` and policy variables stop working.

**N3:**

* **Q112.** Can you put an `Id` in an identity policy?
  **R112.** No: this element is prohibited in identity policies.

### E.2. Effect, Action, Resource

**N1:**

* **Q114.** What values can `Effect` take?
  **R114.** `Allow` or `Deny`.

* **Q115.** How is an action written?
  **R115.** `service:Action`, with wildcards allowed: `s3:GetObject`, `s3:Get*`, `iam:*AccessKey*`.

* **Q118.** Why write two ARNs for Amazon S3?
  **R118.** The bucket and its objects are two distinct resources: `arn:aws:s3:::bucket` and `arn:aws:s3:::bucket/*`.

* **Q119.** What does `"Resource": "*"` mean?
  **R119.** All resources; reserve for actions that do not accept a specific resource.

**N2:**

* **Q116.** What are access levels?
  **R116.** A classification of actions: read (List, Read), write (Write), permissions management, and tagging.

* **Q117.** What does `NotAction` mean?
  **R117.** "All actions except these". Double-check carefully: with `Allow`, it is very broad.

**N3:**

* **Q120.** Is an incomplete ARN accepted?
  **R120.** In an identity policy, missing fields are filled in with wildcards.

### E.3. Principal

**N1:**

* **Q121.** When is the `Principal` element used?
  **R121.** In resource policies and trust policies. It is prohibited in an identity permissions policy.

**N2:**

* **Q122.** What happens with `"Principal": "*"` and `Allow`?
  **R122.** Access becomes public or anonymous.

* **Q123.** How do you specify an entire account?
  **R123.** `"AWS": "arn:aws:iam::ID:root"` or the account ID: this delegates to the account, which must then authorize identities.

**N3:**

* **Q124.** Why avoid `NotPrincipal` with `Deny`?
  **R124.** It produces surprising effects, especially with permissions boundaries. Prefer `ArnNotEquals` on `aws:PrincipalArn`.

* **Q125.** What happens to a policy if the targeted role is deleted and recreated?
  **R125.** It no longer recognizes it: a role's ARN is converted into a unique ID upon registration.

### E.4. Condition

**N1:**

* **Q126.** How does a condition work?
  **R126.** It compares a request context key to a value using an operator; the statement is in effect only if it evaluates to true.

**N2:**

* **Q127.** AND or OR across multiple conditions?
  **R127.** AND across operators and across keys; OR across values of the same key; NOR for negative operators.

* **Q131.** What is the difference between `StringEquals` and `StringLike`?
  **R131.** `StringEquals`: exact match, case-sensitive. `StringLike`: supports `*` and `?` wildcards.

* **Q132.** What is a policy variable?
  **R132.** A placeholder like `${aws:username}` replaced at evaluation time; it requires `"Version": "2012-10-17"`. It is not used with date operators.

* **Q133.** Which condition keys are commonly encountered?
  **R133.** `aws:MultiFactorAuthPresent`, `aws:SourceIp`, `aws:SecureTransport`, `aws:RequestedRegion`, `aws:PrincipalTag`, `aws:ResourceTag`, `aws:PrincipalOrgID`, `aws:CurrentTime`.

* **Q134.** How do you enforce encryption in transit?
  **R134.** A `Deny` with a `Bool` condition on `aws:SecureTransport` set to `"false"`.

**N3:**

* **Q128.** What happens if the key is absent from the request?
  **R128.** Condition is false (no match), except for negative operators (true) and with `IfExists` or `Null`.

* **Q129.** What does `ForAllValues` do when the key is absent?
  **R129.** It returns true; add a `Null` condition set to `false` to require the key to be present.

* **Q130.** What is the `IfExists` suffix used for?
  **R130.** If the key is absent from the request, the condition is treated as true.

### E.5. Reading, Writing, Testing

**N1:**

* **Q135.** How do you read a policy quickly?
  **R135.** The seven questions: version, effect, who, what, on what, when (condition), then combining statements.

* **Q136.** How do you write a minimal policy?
  **R136.** Formulate the requirement, choose the policy type, list minimal actions, write ARNs, add guardrails, validate.

**N2:**

* **Q137.** What are common pitfalls?
  **R137.** Forgetting `/*` for S3 objects, `*` with `*`, generic `Principal`, missing `Version`, missing MFA key, `NotPrincipal` with `Deny`, group in `Principal`.

* **Q139.** How do you test a policy before deploying it?
  **R139.** With IAM Access Analyzer (validation: over 100 checks) and the policy simulator.

**N3:**

* **Q138.** What are the size limits?
  **R138.** Managed policy: 6,144 characters. Inline: 2,048 (user), 5,120 (group), 10,240 (role). Trust policy: 2,048 by default (8,192 maximum). Whitespace does not count.

## F. Policy Types

### F.1. Overview

**N1:**

* **Q140.** How many policy types exist?
  **R140.** Nine: identity, resource, VPC endpoint, permissions boundary, SCP, RCP, ACL, AWS RAM share, and session policy.

* **Q141.** Which ones grant permissions?
  **R141.** Identity policies and resource policies (and, depending on the case, ACLs and RAM shares).

* **Q142.** Which ones set a ceiling/cap?
  **R142.** SCPs, RCPs, permissions boundaries, session policies, and VPC endpoint policies.

**N2:**

* **Q143.** Why do SCPs, RCPs, boundaries, and session policies grant nothing?
  **R143.** They are ceilings: they bound what other policies can grant. There must always be a grant by an identity or resource policy.

* **Q144.** Which type for which need?
  **R144.** Grant a permission: identity. Share a bucket: resource. Delegate without privilege escalation: boundary. Block a service or Region: SCP. Protect resources: RCP. Restrict a session: session policy.

### F.2. Identity Policies

**N1:**

* **Q145.** AWS managed policy, customer managed policy, or inline policy: what is the difference?
  **R145.** AWS managed: created and maintained by AWS. Customer managed: created by you, reusable. Inline: embedded in a single identity, deleted with it.

**N2:**

* **Q146.** Why are AWS managed policies not minimal?
  **R146.** They are designed for all customers: they can grant more than your use case requires.

**N3:**

* **Q147.** How many versions does a managed policy keep?
  **R147.** Up to 5.

### F.3. Resource Policies

**N1:**

* **Q148.** What is a resource policy?
  **R148.** A policy attached to a resource (for example an S3 bucket) that grants permissions to the principal it specifies, in the same account or another.

**N2:**

* **Q149.** Do managed resource policies exist?
  **R149.** No: they are only inline.

* **Q150.** Which services use them?
  **R150.** For example Amazon S3, AWS KMS, Amazon SQS, and Amazon SNS; the full list is in "AWS services that work with IAM".

* **Q151.** Is a trust policy a resource policy?
  **R151.** Yes: it is a role's mandatory resource policy.

### F.4. Permissions Boundaries

**N1:**

* **Q152.** What is a permissions boundary?
  **R152.** A managed policy used as a ceiling for a user or role: effective permissions are the intersection of the boundary and identity policies.

* **Q153.** Does a boundary grant permissions?
  **R153.** No, it only bounds what identity policies can grant.

**N2:**

* **Q154.** What is it used for in practice?
  **R154.** Delegating the creation of roles or users without risk of privilege escalation, by imposing a boundary on created entities.

**N3:**

* **Q155.** Can you apply one to the root user?
  **R155.** No: you cannot define a permissions boundary for the root user.

### F.5. SCPs and RCPs

**N1:**

* **Q156.** What is an SCP?
  **R156.** An AWS Organizations policy that sets the maximum permissions for principals in affected accounts—organization root, OU, or account.

**N2:**

* **Q157.** Does an SCP affect the management account?
  **R157.** No. It also does not affect service-linked roles.

* **Q158.** Does an SCP apply to a member account's root user?
  **R158.** Yes.

* **Q161.** What is an RCP?
  **R161.** The equivalent of an SCP for resources: it sets the maximum permissions on resources in member accounts, regardless of the requester.

* **Q162.** What is the difference between an SCP and an RCP?
  **R162.** An SCP caps what principals in the organization can do; an RCP caps what can be done on resources, including by external identities.

**N3:**

* **Q159.** Deny list or allow list?
  **R159.** Deny list: keep `FullAWSAccess` and add `Deny` statements (default configuration). Allow list: remove `FullAWSAccess` and explicitly allow at each level.

* **Q160.** Which SCP is attached by default?
  **R160.** The `FullAWSAccess` managed policy, which allows everything.

* **Q163.** What is `RCPFullAWSAccess`?
  **R163.** The managed policy attached automatically when RCPs are enabled; it cannot be detached.

### F.6. Session, ACL, VPC Endpoint, RAM

**N2:**

* **Q164.** What is a session policy?
  **R164.** A policy passed as a parameter when creating a session for a role or federated user: it reduces permissions, never increases them.

**N3:**

* **Q165.** What is an ACL?
  **R165.** An access control list governing access by principals from other accounts to a resource; the only type not using JSON, and it cannot grant permissions within the same account.

* **Q166.** What is a VPC endpoint policy?
  **R166.** A resource policy attached to a VPC endpoint: an additional access boundary for traffic passing through it.

* **Q167.** What are AWS RAM shares used for?
  **R167.** Sharing resources across accounts; managed permissions define the recipients' actions.

## G. Permission Evaluation

### G.1. Principles and Order

**N1:**

* **Q168.** What are the three principles?
  **R168.** Default deny; explicit authorization is required; explicit deny always wins.

* **Q169.** In what order does AWS evaluate policies?
  **R169.** 1) explicit denies, 2) RCPs, 3) SCPs, 4) resource policies, 5) identity policies, 6) permissions boundary, 7) session policy.

* **Q171.** What sentence summarizes the algorithm?
  **R171.** To pass: no applicable `Deny`, all ceilings allow, and at least one `Allow` (identity or resource) grants access.

**N2:**

* **Q170.** Why is `Deny` evaluated first?
  **R170.** Because it applies across all layers and overrides any `Allow`: a single one is enough to deny.

### G.2. The Seven Steps

**N2:**

* **Q172.** What does the explicit denies step check?
  **R172.** Whether an applicable `Deny` exists in any policy (SCP, RCP, resource, identity, boundary, session); if so, final deny.

* **Q173.** What does the RCP step check?
  **R173.** If RCPs apply, at least one `Allow` must match; otherwise deny.

* **Q174.** What does the SCP step check?
  **R174.** If SCPs apply, at least one `Allow` must match; otherwise deny.

* **Q176.** What does the identity policies step check?
  **R176.** That at least one identity policy allows the action (for a user: their own and their groups'); otherwise implicit deny.

* **Q177.** What does the permissions boundary step check?
  **R177.** If a boundary exists, it must allow the action; otherwise implicit deny.

**N3:**

* **Q175.** What happens at the resource policies step?
  **R175.** Depending on the targeted principal, an `Allow` can directly result in authorization, even if the identity, boundary, or session does not allow it.

* **Q178.** What does the session policy step check?
  **R178.** Without a session: allowed. Session without a session policy: allowed. With a session policy: it must allow the action.

### G.3. Same Account, Cross-Account, Targeted Principal

**N2:**

* **Q179.** Within the same account, identity and resource: AND or OR?
  **R179.** OR: an `Allow` in the identity policy or in the resource policy can suffice (barring special cases).

* **Q180.** And cross-account?
  **R180.** AND: AWS performs two evaluations (principal's account, resource's account) and requires `Allow` in both.

**N3:**

* **Q181.** What changes when a resource policy targets an IAM user?
  **R181.** The grant is direct: an implicit deny from an identity policy or boundary does not block it.

* **Q182.** And if it targets a role?
  **R182.** The requester is the role session; the grant remains bounded by an implicit deny from the permissions boundary or session policy.

* **Q183.** And if it targets a role session?
  **R183.** Direct grant to the session: not bounded by identity, boundary, or session policy.

* **Q184.** And if it targets the account (`:root`)?
  **R184.** Trust is delegated to the account: the identity must still be authorized by an identity policy.

* **Q185.** What are the exceptions where an explicit `Allow` is required?
  **R185.** Role trust policies and KMS key policies must explicitly allow principals.

### G.4. Resolved Cases

**N2:**

* **Q186.** An administrator (`AdministratorAccess`) is denied by an SCP: why?
  **R186.** SCP step: no `Allow` for this action in SCPs along the path → denied, regardless of the identity policy.

* **Q188.** An identity `Allow` is neutralized by a `Deny` in the bucket policy: how?
  **R188.** At step 1, an applicable `Deny` (condition true) ends evaluation: explicit deny.

* **Q189.** A user in account A has an `Allow` on a bucket in account B, with no authorization on side B: result?
  **R189.** Denied: evaluation in account B does not return `Allow`.

* **Q190.** A session created with a session policy limited to `s3:GetObject` attempts `s3:PutObject`: result?
  **R190.** Implicit deny at step 7: the session policy does not allow `PutObject`.

**N3:**

* **Q187.** A user has `AmazonS3FullAccess` but a boundary without S3: can they read a bucket?
  **R187.** No, unless the bucket policy names them explicitly (user ARN): direct grant, not bounded by the boundary.

### G.5. Explicit Deny

**N1:**

* **Q194.** What is the difference between implicit deny and explicit deny?
  **R194.** Implicit: no policy allows (default value, an `Allow` can lift it). Explicit: a written `Deny`, which takes precedence over everything.

**N2:**

* **Q191.** Does a `Deny` whose condition is false apply?
  **R191.** No: the statement is in effect only if the condition is true.

* **Q192.** How do you lift an explicit `Deny`?
  **R192.** Only by modifying or deleting it: no `Allow` can cancel it.

**N3:**

* **Q193.** Does a `Deny` in an SCP apply to the root user?
  **R193.** Yes for the root user of member accounts.

## H. Least Privilege

### H.1. Principle

**N1:**

* **Q195.** What is least privilege?
  **R195.** Granting only the permissions required to perform a task, specifying actions, on specific resources, under specific conditions.

* **Q196.** Why apply it?
  **R196.** To reduce the attack surface and impact of errors, simplify auditing, and hinder privilege escalation.

**N2:**

* **Q197.** Should you start broad or narrow?
  **R197.** AWS allows starting with broad permissions during exploration, then narrowing them; the target remains minimal permissions.

### H.2. Recommended Approach

**N2:**

* **Q198.** How do you start concretely?
  **R198.** With AWS managed policies, then, after an observation period, replace them with a narrower customer managed policy.

* **Q199.** What observation period should you take?
  **R199.** A predefined sampling period, for example 90 days.

* **Q200.** How do you build the narrowed policy?
  **R200.** Review the services actually used during the period, create a customer managed policy restricted to them, detach the AWS policy, and attach the new one.

* **Q201.** What should you do with IAM Identity Center?
  **R201.** Start with permission sets; without Identity Center, use IAM roles to define permissions.

* **Q202.** Which managed policies can serve as a starting point?
  **R202.** AWS job function managed policies, usable with roles or permission sets.

### H.3. Refinement Tools

**N2:**

* **Q203.** What is last-accessed information used for?
  **R203.** Identifying unused users, roles, permissions, policies, and credentials to remove them or tighten policies.

* **Q204.** What does IAM Access Analyzer policy generation do?
  **R204.** It analyzes activity recorded by CloudTrail and proposes a fine-grained policy; test before deploying.

* **Q205.** What does Access Analyzer validation do?
  **R205.** Over 100 checks, with recommendations for writing safe and functional policies.

* **Q206.** How do you detect public or cross-account access?
  **R206.** With Access Analyzer, which previews and continuously monitors such access.

### H.4. Writing Techniques

**N1:**

* **Q207.** How do you tighten a policy?
  **R207.** Reduce actions, specify exact ARNs, add conditions (TLS, MFA, Region, IP address, tags).

**N2:**

* **Q208.** How do you leverage tags?
  **R208.** With ABAC: compare `aws:PrincipalTag` and `aws:ResourceTag` to grant access based on attributes rather than lists.

* **Q209.** How do you delegate safely?
  **R209.** Impose a permissions boundary on entities created by delegates.

* **Q210.** How do you set guardrails across multiple accounts?
  **R210.** With SCPs (principals) and RCPs (resources).

### H.5. Best Practices and Governance

**N1:**

* **Q211.** What are the essential official best practices?
  **R211.** Federation and temporary credentials for humans, roles for workloads, MFA, minimized long-term keys, protected root, least privilege, validation, guardrails.

* **Q213.** What anti-patterns should be avoided?
  **R213.** `*` with `*`, shared access keys, daily use of root, generic `Principal`, untested SCPs, permissions never reviewed.

**N2:**

* **Q212.** Why regularly remove unused items?
  **R212.** To reduce the attack surface: unused users, roles, permissions, policies, and credentials.

## I. Tools and Troubleshooting

### I.1. Diagnosing a Denial

**N2:**

* **Q214.** How do you diagnose an `AccessDenied`?
  **R214.** Trace the algorithm: identify the exact principal, look for an explicit `Deny`, check SCP and RCP, resource policy, identity policies, boundary, session policy, conditions, then both sides for cross-account access.

* **Q215.** Why doesn't a role have the permissions of the user who assumes it?
  **R215.** Because the user gives up their permissions to take on only those of the role.

* **Q216.** What is the most puzzling cause of a denial?
  **R216.** An explicit `Deny` in another layer (SCP, RCP, resource, boundary, or session).

* **Q218.** What should you check for cross-account access?
  **R218.** An `Allow` in both accounts: identity policy on the requester side and resource policy on the owner side.

**N3:**

* **Q217.** What pitfall exists with an MFA condition?
  **R217.** The `aws:MultiFactorAuthPresent` key is absent with long-term access keys: the condition does not match.

### I.2. Tools

**N2:**

* **Q219.** What is the policy simulator used for?
  **R219.** Testing the effect of policies without executing the request (`SimulatePrincipalPolicy` and `SimulateCustomPolicy` actions).

* **Q220.** What are CloudTrail logs used for?
  **R220.** Finding out who did what (including session name) and feeding policy generation.

* **Q221.** What uses of IAM Access Analyzer does this document present?
  **R221.** Generating policies from CloudTrail activity, validating policies (over 100 checks), and spotting public or cross-account access.

## J. Scenarios

### J.1. Granting Access

**N1:**

* **Q222.** An intern needs to read a single bucket for a month: what should you do?
  **R222.** A role assumed via federation (Identity Center), with `s3:ListBucket` and `s3:GetObject` on that bucket, a short session, and removing the assignment when it expires.

* **Q223.** An application on EC2 needs to read a bucket: how?
  **R223.** A role delivered to the instance; its temporary credentials are discovered by SDKs, with no stored key.

**N2:**

* **Q224.** A third-party auditor needs to audit my account: how?
  **R224.** An audit role assumed from their account, with a specific trust policy, `ExternalId`, and read-only permissions.

* **Q225.** A CI/CD pipeline needs to deploy without keys: how?
  **R225.** Use `AssumeRoleWithWebIdentity` with the pipeline's OIDC token and a role whose trust policy specifies that provider.

* **Q226.** A bucket needs to be readable by another account: how?
  **R226.** A bucket policy allowing the other account's principal, and an identity policy in that account allowing it as well.

### J.2. Limiting and Protecting

**N2:**

* **Q228.** I want to block a Region across the entire organization: how?
  **R228.** A deny-list SCP using `aws:RequestedRegion`, tested first on a pilot OU; plan exceptions for global services.

* **Q230.** How do you restrict a session to a single action?
  **R230.** By passing a session policy to the `AssumeRole` call.

**N3:**

* **Q227.** A developer needs to create roles without becoming an administrator: how?
  **R227.** Grant role creation on the condition that created roles carry an enforced permissions boundary.

* **Q229.** How do you prevent access to your resources by identities outside the organization?
  **R229.** With an RCP, which caps permissions on resources, including for external identities.

* **Q231.** Do SCPs also protect the management account?
  **R231.** No, they do not affect it: keep minimal workloads there and place the rest in member accounts, where SCPs apply.

### J.3. Tricky Cases

**N2:**

* **Q232.** My administrator gets `AccessDenied`: why?
  **R232.** Look for an explicit `Deny`, then an SCP or RCP without `Allow` along the OU path, a restrictive boundary or session policy, and finally a condition (TLS, MFA, IP).

**N3:**

* **Q233.** My user has a boundary without S3 yet reads a bucket: why?
  **R233.** Probably a bucket policy naming them by their user ARN: direct grant.

* **Q234.** I delete a role and recreate it: do my trust policies work?
  **R234.** No: the ARN had been converted into a unique ID; policies must be updated.

* **Q235.** Does a `Deny` placed in an SCP block a member account's root user?
  **R235.** Yes: SCPs apply to member accounts' root users.

* **Q236.** I lost my root MFA device: what should I do?
  **R236.** Go through the recovery process provided by AWS (registered email address and phone number); that is why multiple MFA devices are registered and those channels are protected.