export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  price: number;
  stock: number;
  cover_url: string | null;
  category_id: string | null;
  isbn: string | null;
  active: boolean;
  created_at: string;
  category?: Category | null;
};
