export interface ThreadType {
  id: string;
  name?: string;
  crashed?: boolean;
  stacktrace?: any;
  rawStacktrace?: any;
  current?: any;
  values?: Array<any>;
}
