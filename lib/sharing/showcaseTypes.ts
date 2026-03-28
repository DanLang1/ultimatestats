export interface ShowcaseGameMeta {
  id: string;
  game_id: string;
  title: string;
  description: string | null;
  tags: string[];
  created_at: string;
  import_count: number;
}
