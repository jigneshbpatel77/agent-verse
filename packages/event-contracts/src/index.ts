export interface EventHeader {
  eventId: string;
  correlationId: string;
  source: string;
  timestamp: string;
  version: string;
}

export interface BaseKafkaEvent<T> {
  header: EventHeader;
  payload: T;
}

// 1. Task Lifecycle Events
export interface AgentTaskCreatedPayload {
  taskId: string;
  workflowId: string;
  agentId: string;
  taskType: string;
  inputContext: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}
export type AgentTaskCreatedEvent = BaseKafkaEvent<AgentTaskCreatedPayload>;

export interface AgentTaskAcceptedPayload {
  taskId: string;
  agentId: string;
  assignedWorkerId?: string;
  startedAt: string;
}
export type AgentTaskAcceptedEvent = BaseKafkaEvent<AgentTaskAcceptedPayload>;

export interface AgentTaskCompletedPayload {
  taskId: string;
  agentId: string;
  outputData: Record<string, any>;
  completedAt: string;
}
export type AgentTaskCompletedEvent = BaseKafkaEvent<AgentTaskCompletedPayload>;

export interface AgentTaskFailedPayload {
  taskId: string;
  agentId: string;
  errorCode: string;
  errorMessage: string;
  stackTrace?: string;
  failedAt: string;
}
export type AgentTaskFailedEvent = BaseKafkaEvent<AgentTaskFailedPayload>;

// 2. Product & Design Events
export interface ProductPrdApprovedPayload {
  prdId: string;
  vehicleSegment: 'two-wheeler' | 'four-wheeler' | 'commercial';
  specifications: Record<string, any>;
  approvedBy: string;
}
export type ProductPrdApprovedEvent = BaseKafkaEvent<ProductPrdApprovedPayload>;

// 3. Architecture Events
export interface ArchitectureHldReadyPayload {
  prdId: string;
  hldId: string;
  architectureDiagrams: string[];
  systemComponents: string[];
  schemaDefinitions: Record<string, any>;
}
export type ArchitectureHldReadyEvent = BaseKafkaEvent<ArchitectureHldReadyPayload>;

export interface ArchitectureLldReadyPayload {
  hldId: string;
  lldId: string;
  classDiagrams: string[];
  interfaceDefinitions: Record<string, any>;
  apiSpecsPath: string;
}
export type ArchitectureLldReadyEvent = BaseKafkaEvent<ArchitectureLldReadyPayload>;

// 4. Engineering Events
export interface EngineeringTaskAcceptedPayload {
  taskId: string;
  componentName: string;
  developerAgentId: string;
}
export type EngineeringTaskAcceptedEvent = BaseKafkaEvent<EngineeringTaskAcceptedPayload>;

export interface EngineeringUiGeneratedPayload {
  taskId: string;
  screenId: string;
  figmaUrl?: string;
  generatedCode: string;
  framework: 'NextJS' | 'React' | 'Tailwind';
}
export type EngineeringUiGeneratedEvent = BaseKafkaEvent<EngineeringUiGeneratedPayload>;

export interface EngineeringBackendGeneratedPayload {
  taskId: string;
  endpointUrl: string;
  generatedCode: string;
  framework: 'NestJS' | 'FastAPI';
}
export type EngineeringBackendGeneratedEvent = BaseKafkaEvent<EngineeringBackendGeneratedPayload>;

export interface EngineeringApiDocGeneratedPayload {
  taskId: string;
  swaggerJson: string;
  endpointsCount: number;
}
export type EngineeringApiDocGeneratedEvent = BaseKafkaEvent<EngineeringApiDocGeneratedPayload>;

export interface EngineeringFrontendCompletedPayload {
  taskId: string;
  componentPath: string;
  pullRequestUrl: string;
}
export type EngineeringFrontendCompletedEvent = BaseKafkaEvent<EngineeringFrontendCompletedPayload>;

export interface EngineeringAndroidCompletedPayload {
  taskId: string;
  buildApkUrl: string;
  changelog: string;
}
export type EngineeringAndroidCompletedEvent = BaseKafkaEvent<EngineeringAndroidCompletedPayload>;

export interface EngineeringIosCompletedPayload {
  taskId: string;
  buildIpaUrl: string;
  changelog: string;
}
export type EngineeringIosCompletedEvent = BaseKafkaEvent<EngineeringIosCompletedPayload>;

export interface EngineeringPrCreatedPayload {
  prId: string;
  title: string;
  repository: string;
  sourceBranch: string;
  targetBranch: string;
}
export type EngineeringPrCreatedEvent = BaseKafkaEvent<EngineeringPrCreatedPayload>;

export interface EngineeringKnowledgeUpdatedPayload {
  topic: string;
  embeddingIds: string[];
  summary: string;
}
export type EngineeringKnowledgeUpdatedEvent = BaseKafkaEvent<EngineeringKnowledgeUpdatedPayload>;

// 5. Quality Assurance Events
export interface QualityTestingStartedPayload {
  testRunId: string;
  targetService: string;
  testSuiteType: 'unit' | 'integration' | 'e2e' | 'perf';
}
export type QualityTestingStartedEvent = BaseKafkaEvent<QualityTestingStartedPayload>;

export interface QualityTestingCompletedPayload {
  testRunId: string;
  passedCount: number;
  failedCount: number;
  coveragePercentage: number;
  reportUrl: string;
}
export type QualityTestingCompletedEvent = BaseKafkaEvent<QualityTestingCompletedPayload>;

export interface QualityBugCreatedPayload {
  bugId: string;
  title: string;
  severity: 'minor' | 'major' | 'critical';
  reproductionSteps: string[];
  targetService: string;
}
export type QualityBugCreatedEvent = BaseKafkaEvent<QualityBugCreatedPayload>;

// 6. DevOps & Deployment Events
export interface DevopsDeploymentReadyPayload {
  deploymentId: string;
  serviceName: string;
  dockerImageTag: string;
  kubernetesNamespace: string;
}
export type DevopsDeploymentReadyEvent = BaseKafkaEvent<DevopsDeploymentReadyPayload>;

export interface DevopsDeploymentCompletedPayload {
  deploymentId: string;
  serviceName: string;
  status: 'success' | 'failed';
  deployedUrl: string;
}
export type DevopsDeploymentCompletedEvent = BaseKafkaEvent<DevopsDeploymentCompletedPayload>;

export interface DevopsRollbackRequestedPayload {
  deploymentId: string;
  serviceName: string;
  reason: string;
  targetVersion: string;
}
export type DevopsRollbackRequestedEvent = BaseKafkaEvent<DevopsRollbackRequestedPayload>;

// 7. Analytics & Root Cause Events
export interface AnalyticsAnomalyDetectedPayload {
  anomalyId: string;
  metricName: string;
  observedValue: number;
  expectedThreshold: number;
  timestamp: string;
}
export type AnalyticsAnomalyDetectedEvent = BaseKafkaEvent<AnalyticsAnomalyDetectedPayload>;

export interface AnalyticsReportGeneratedPayload {
  reportId: string;
  reportType: 'business' | 'performance' | 'cost';
  summary: string;
  pdfUrl: string;
}
export type AnalyticsReportGeneratedEvent = BaseKafkaEvent<AnalyticsReportGeneratedPayload>;

export interface AnalyticsRcaCompletedPayload {
  anomalyId: string;
  rcaId: string;
  rootCause: string;
  resolutionSteps: string[];
}
export type AnalyticsRcaCompletedEvent = BaseKafkaEvent<AnalyticsRcaCompletedPayload>;

// 8. Security Events
export interface SecurityFindingCreatedPayload {
  findingId: string;
  vulnerabilityType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  filePath?: string;
  remediationAdvice: string;
}
export type SecurityFindingCreatedEvent = BaseKafkaEvent<SecurityFindingCreatedPayload>;

// 9. Support & Incident Events
export interface SupportTicketEscalatedPayload {
  ticketId: string;
  customerName: string;
  vehicleRegNo?: string;
  issueDescription: string;
  escalatedTo: string;
}
export type SupportTicketEscalatedEvent = BaseKafkaEvent<SupportTicketEscalatedPayload>;

export interface IncidentStartedPayload {
  incidentId: string;
  title: string;
  severity: 'sev1' | 'sev2' | 'sev3';
  affectedComponents: string[];
}
export type IncidentStartedEvent = BaseKafkaEvent<IncidentStartedPayload>;

export interface IncidentResolvedPayload {
  incidentId: string;
  resolvedAt: string;
  resolutionSummary: string;
}
export type IncidentResolvedEvent = BaseKafkaEvent<IncidentResolvedPayload>;

// 10. Approvals & System Memory
export interface ApprovalRequestedPayload {
  approvalId: string;
  workflowStepId: string;
  requestorId: string;
  approverRole: string;
  contextData: Record<string, any>;
}
export type ApprovalRequestedEvent = BaseKafkaEvent<ApprovalRequestedPayload>;

export interface ApprovalCompletedPayload {
  approvalId: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  approverId: string;
}
export type ApprovalCompletedEvent = BaseKafkaEvent<ApprovalCompletedPayload>;

export interface KnowledgeDocumentIngestedPayload {
  documentId: string;
  title: string;
  collectionName: 'product_docs' | 'architecture_docs' | 'engineering_docs' | 'support_kb';
  chunkCount: number;
}
export type KnowledgeDocumentIngestedEvent = BaseKafkaEvent<KnowledgeDocumentIngestedPayload>;

export interface MemoryUpdatedPayload {
  sessionKey: string;
  agentId: string;
  updatedFields: string[];
}
export type MemoryUpdatedEvent = BaseKafkaEvent<MemoryUpdatedPayload>;

// Event Topic Mapping Constants
export const EVENT_TOPICS = {
  AGENT_TASK_CREATED: 'agent.task.created',
  AGENT_TASK_ACCEPTED: 'agent.task.accepted',
  AGENT_TASK_COMPLETED: 'agent.task.completed',
  AGENT_TASK_FAILED: 'agent.task.failed',
  PRODUCT_PRD_APPROVED: 'product.prd.approved',
  ARCHITECTURE_HLD_READY: 'architecture.hld.ready',
  ARCHITECTURE_LLD_READY: 'architecture.lld.ready',
  ENGINEERING_TASK_ACCEPTED: 'engineering.task.accepted',
  ENGINEERING_UI_GENERATED: 'engineering.ui.generated',
  ENGINEERING_BACKEND_GENERATED: 'engineering.backend.generated',
  ENGINEERING_API_DOC_GENERATED: 'engineering.api_doc.generated',
  ENGINEERING_FRONTEND_COMPLETED: 'engineering.frontend.completed',
  ENGINEERING_ANDROID_COMPLETED: 'engineering.android.completed',
  ENGINEERING_IOS_COMPLETED: 'engineering.ios.completed',
  ENGINEERING_PR_CREATED: 'engineering.pr.created',
  ENGINEERING_KNOWLEDGE_UPDATED: 'engineering.knowledge.updated',
  QUALITY_TESTING_STARTED: 'quality.testing.started',
  QUALITY_TESTING_COMPLETED: 'quality.testing.completed',
  QUALITY_BUG_CREATED: 'quality.bug.created',
  DEVOPS_DEPLOYMENT_READY: 'devops.deployment.ready',
  DEVOPS_DEPLOYMENT_COMPLETED: 'devops.deployment.completed',
  DEVOPS_ROLLBACK_REQUESTED: 'devops.rollback.requested',
  ANALYTICS_ANOMALY_DETECTED: 'analytics.anomaly.detected',
  ANALYTICS_REPORT_GENERATED: 'analytics.report.generated',
  ANALYTICS_RCA_COMPLETED: 'analytics.rca.completed',
  SUPPORT_TICKET_ESCALATED: 'support.ticket.escalated',
  SECURITY_FINDING_CREATED: 'security.finding.created',
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_COMPLETED: 'approval.completed',
  INCIDENT_STARTED: 'incident.started',
  INCIDENT_RESOLVED: 'incident.resolved',
  KNOWLEDGE_DOCUMENT_INGESTED: 'knowledge.document.ingested',
  MEMORY_UPDATED: 'memory.updated'
} as const;