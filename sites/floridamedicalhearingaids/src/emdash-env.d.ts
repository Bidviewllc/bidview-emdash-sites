/// <reference types="emdash/types" />

declare module 'emdash/types' {
  interface EmDashCollections {
    site_settings: {
      site_name: string;
      phone: string;
      email: string;
      address: string;
      meta_title: string;
      meta_description: string;
      og_image: string;
      head_extra: string;
      body: string;
    };
    pages: {
      meta_title: string;
      meta_description: string;
      og_image: string;
      h1: string;
      head_extra: string;
      body: string;
    };
    posts: {
      meta_title: string;
      meta_description: string;
      og_image: string;
      h1: string;
      head_extra: string;
      body: string;
    };
    team_members: {
      meta_title: string;
      meta_description: string;
      og_image: string;
      h1: string;
      head_extra: string;
      body: string;
    };
    locations: {
      meta_title: string;
      meta_description: string;
      og_image: string;
      h1: string;
      head_extra: string;
      body: string;
    };
    hearing_aid_brands: {
      meta_title: string;
      meta_description: string;
      og_image: string;
      h1: string;
      head_extra: string;
      body: string;
    };
  }
}
