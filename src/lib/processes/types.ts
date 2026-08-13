import { Conversation, ProcessKey, Tenant } from "@/lib/types";

export type ProcessContext = {
  tenant: Tenant;
  conversation: Conversation;
  inboundText: string;
};

export type OutboundAction = {
  body: string;
  type?: "text" | "template" | "interactive";
  processKey: ProcessKey;
};

export type ProcessResult = {
  handled: boolean;
  replies: OutboundAction[];
  conversationPatch?: Partial<Conversation>;
  events?: string[];
};

export type ProcessHandler = {
  key: ProcessKey;
  /** Return true if this process should claim the inbound message now */
  canHandle: (ctx: ProcessContext) => boolean;
  handle: (ctx: ProcessContext) => Promise<ProcessResult> | ProcessResult;
};
