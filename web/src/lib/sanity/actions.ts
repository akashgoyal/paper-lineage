'use server'

import {updateTag} from 'next/cache'
import {SANITY_TAG} from './client'

/** Expire every cached Sanity read so the next render fetches fresh content (read-your-own-writes). */
export async function refreshSanity() {
  updateTag(SANITY_TAG)
}
