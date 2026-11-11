import { supabase } from '@/core/supabase/client';
import type { PostCatalogItem } from '../types/postCatalog';
import {
  DEFAULT_POST_CATALOG,
  comparePostCatalogHigherToLower,
} from '../constants/establishmentPostCatalog';

const CONFIG_KEY = 'establishment_post_catalog';
const STORAGE_KEY = 'icdp_establishment_post_catalog';

/**
 * Fetch the master catalog of departmental post names with pay scale and class.
 * Guaranteed to return in order from higher pay to lower.
 */
export async function fetchPostCatalog(): Promise<PostCatalogItem[]> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', CONFIG_KEY)
      .maybeSingle();

    if (!error && data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sorted = [...parsed].sort(comparePostCatalogHigherToLower);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
          return sorted;
        }
      } catch (err) {
        console.warn('Failed to parse post catalog from app_config, falling back:', err);
      }
    }
  } catch (err) {
    console.warn('Network issue loading post catalog, reading cache:', err);
  }

  // Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return [...parsed].sort(comparePostCatalogHigherToLower);
      }
    }
  } catch {
    // Ignore cache parse error
  }

  // Default seed catalog (already sorted higher to lower)
  return DEFAULT_POST_CATALOG;
}

/**
 * Save updated post catalog to database and cache, preserving higher to lower pay order.
 */
export async function savePostCatalog(catalog: PostCatalogItem[]): Promise<void> {
  const sorted = [...catalog].sort(comparePostCatalogHigherToLower).map((item, idx) => ({
    ...item,
    displayOrder: idx + 1,
  }));
  const jsonValue = JSON.stringify(sorted);

  // Write to cache immediately
  try {
    localStorage.setItem(STORAGE_KEY, jsonValue);
  } catch {
    // ignore local storage quota errors
  }

  // Upsert to backend
  const { error } = await supabase.from('app_config').upsert(
    {
      key: CONFIG_KEY,
      value: jsonValue,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );

  if (error) {
    console.error('Failed to persist post catalog to app_config:', error);
    throw new Error(`Failed to save post catalog: ${error.message}`);
  }
}

/**
 * Cascade post details (Pay Scale & Class) to all existing positions matching this post name.
 */
export async function syncPostWithExistingPositions(
  oldNameGu: string,
  item: PostCatalogItem
): Promise<number> {
  const { data, error } = await supabase
    .from('positions')
    .update({
      designation_title_gu: item.nameGu.trim(),
      designation_title: item.nameEn.trim(),
      cadre_class: item.cadreClass,
      pay_matrix_level: item.payLevel,
      pay_scale: item.payScale,
      updated_at: new Date().toISOString(),
    })
    .eq('designation_title_gu', oldNameGu.trim())
    .select('id');

  if (error) {
    console.error('Failed to sync positions for post:', error);
    throw new Error(`Failed to cascade to positions: ${error.message}`);
  }

  return (data || []).length;
}

/**
 * Reset catalog back to departmental default 61 posts.
 */
export async function resetPostCatalogToDefault(): Promise<PostCatalogItem[]> {
  await savePostCatalog(DEFAULT_POST_CATALOG);
  return DEFAULT_POST_CATALOG;
}
