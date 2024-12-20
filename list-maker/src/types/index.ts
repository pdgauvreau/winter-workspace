export interface ListItem {
  id: string;
  text: string;
  groupId?: string;
  price?: number;
  link?: string;
  mediaUrl?: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface List {
  id: string;
  name: string;
  groups: Group[];
  items: ListItem[];
}

export interface AppState {
  lists: List[];
  activeListId: string;
}
