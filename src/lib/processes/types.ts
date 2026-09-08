import { Conversation, ProcessKey, Tenant } from "@/lib/types";

export type ProcessContext = {
  tenant: Tenant;
  conversation: Conversation;
  inboundText: string;
  interactiveId?: string;
  locationAddress?: string;
  flowResponseJson?: string;
  referral?: Conversation["referral"];
};

export type InteractiveButtonsPayload = {
  kind: "buttons";
  buttons: Array<{ id: string; title: string }>;
  footer?: string;
};

export type InteractiveListPayload = {
  kind: "list";
  buttonLabel: string;
  sections: Array<{
    title?: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
};

export type InteractiveLocationPayload = {
  kind: "location_request";
};

export type InteractiveFlowPayload = {
  kind: "flow";
  flowId?: string;
  flowName?: string;
  flowToken?: string;
  screen?: string;
};

export type TemplatePayload = {
  name: string;
  languageCode?: string;
  bodyParameters?: string[];
};

export type MediaPayload = {
  mediaType: "image" | "document" | "audio" | "video";
  link: string;
  caption?: string;
  filename?: string;
};

export type OutboundAction = {
  body: string;
  type?: "text" | "template" | "interactive";
  processKey: ProcessKey;
  interactive?:
    | InteractiveButtonsPayload
    | InteractiveListPayload
    | InteractiveLocationPayload
    | InteractiveFlowPayload;
  template?: TemplatePayload;
  media?: MediaPayload;
};

export type ProcessResult = {
  handled: boolean;
  replies: OutboundAction[];
  conversationPatch?: Partial<Conversation>;
  events?: string[];
};

export type ProcessHandler = {
  key: ProcessKey;
  canHandle: (ctx: ProcessContext) => boolean;
  handle: (ctx: ProcessContext) => Promise<ProcessResult> | ProcessResult;
};
