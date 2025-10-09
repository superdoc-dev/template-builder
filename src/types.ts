import type { SuperDoc } from "superdoc"; // eslint-disable-line

export interface FieldDefinition {
  id: string;
  label: string;
  category?: string;
  defaultValue?: string;
  metadata?: Record<string, any>;
}

export interface TemplateField {
  id: string;
  alias: string;
  tag?: string;
  position?: number;
}

export interface TriggerEvent {
  position: { from: number; to: number };
  bounds?: DOMRect;
  cleanup: () => void;
}

export interface SlashMenuContext {
  hasSelection: boolean;
  selectedText?: string;
}

export interface SlashMenuItem {
  id: string;
  label: string;
  icon?: string;
  showWhen?: (context: SlashMenuContext) => boolean;
  action: (editor: any | null | undefined, context: SlashMenuContext) => void | Promise<void>;
}

export interface SlashMenuConfig {
  items?: SlashMenuItem[];
  [key: string]: unknown;
}

export interface FieldMenuProps {
  isVisible: boolean;
  position?: DOMRect;
  availableFields: FieldDefinition[];
  filteredFields?: FieldDefinition[];
  filterQuery?: string;
  allowCreate?: boolean;
  onSelect: (field: FieldDefinition) => void;
  onClose: () => void;
  onCreateField?: (
    field: FieldDefinition,
  ) => void | Promise<FieldDefinition | void>;
}

export interface FieldListProps {
  fields: TemplateField[];
  onSelect: (field: TemplateField) => void;
  onDelete: (fieldId: string) => void;
  selectedFieldId?: string;
}

export interface DocumentConfig {
  source?: string | File | Blob;
  mode?: "editing" | "viewing";
}

export interface FieldsConfig {
  available?: FieldDefinition[];
  initial?: TemplateField[];
  allowCreate?: boolean;
}

export interface MenuConfig {
  component?: React.ComponentType<FieldMenuProps>;
  trigger?: string;
}

export interface ListConfig {
  component?: React.ComponentType<FieldListProps>;
  position?: "left" | "right";
}

export interface ToolbarConfig {
  selector?: string;
  toolbarGroups?: string[];
  groups?: Record<string, string[]>;
  fonts?: string[] | null;
  hideButtons?: boolean;
  responsiveToContainer?: boolean;
  excludeItems?: string[];
  texts?: Record<string, string>;
  icons?: Record<string, any>;
}

export interface SuperDocTemplateBuilderProps {
  document?: DocumentConfig;
  fields?: FieldsConfig;
  menu?: MenuConfig;
  list?: ListConfig;
  toolbar?: boolean | string | ToolbarConfig;
  slashMenu?: SlashMenuConfig;

  // Events
  onReady?: () => void;
  onTrigger?: (event: TriggerEvent) => void;
  onFieldInsert?: (field: TemplateField) => void;
  onFieldUpdate?: (field: TemplateField) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldsChange?: (fields: TemplateField[]) => void;
  onFieldSelect?: (field: TemplateField | null) => void;
  onFieldCreate?: (
    field: FieldDefinition,
  ) => void | Promise<FieldDefinition | void>;

  // UI
  className?: string;
  style?: React.CSSProperties;
  documentHeight?: string;
}

export interface SuperDocTemplateBuilderHandle {
  insertField: (field: Partial<FieldDefinition> & { alias: string }) => boolean;
  insertBlockField: (
    field: Partial<FieldDefinition> & { alias: string },
  ) => boolean;
  updateField: (id: string, updates: Partial<TemplateField>) => boolean;
  deleteField: (id: string) => boolean;
  selectField: (id: string) => void;
  nextField: () => void;
  previousField: () => void;
  getFields: () => TemplateField[];
  exportTemplate: (options?: { fileName?: string }) => Promise<void>;
}
