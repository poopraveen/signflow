export type FieldType = "signature" | "date" | "text";

export interface Signer {
  id: string;
  name: string;
  email: string;
  order: number;
  /** Issued when the envelope is sent; used in /sign URLs. Omitted in API responses to browsers. */
  signToken?: string;
}

export interface Field {
  id: string;
  type: FieldType;
  pageIndex: number;
  signerId: string;
  /** 0–1 relative to page width */
  x: number;
  /** 0–1 relative to page height */
  y: number;
  /** 0–1 relative to page width */
  width: number;
  /** 0–1 relative to page height */
  height: number;
  value?: string;
}

export type EnvelopeStatus = "draft" | "sent" | "completed";

export interface Envelope {
  id: string;
  title: string;
  status: EnvelopeStatus;
  signers: Signer[];
  fields: Field[];
  createdAt: string;
  completedAt?: string;
}
