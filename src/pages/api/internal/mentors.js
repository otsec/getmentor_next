import Cors from 'cors'
import initMiddleware from '../../../lib/init-middleware'
import { AUTH_TOKEN, CALENDAR_URL } from '../../../lib/entities'

import { getMentors as getMentorsFromData } from '../../../server/airtable-mentors'

const NodeCache = require('node-cache')
const mentorsCache = new NodeCache({
  stdTTL: 60,
  checkperiod: 10,
  useClones: false,
  deleteOnExpire: false,
})
mentorsCache.on('expired', refresh)

refresh()

// Initialize the cors middleware
const cors = initMiddleware(
  // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
  Cors({
    // Only allow requests with POST and OPTIONS
    methods: ['GET', 'POST', 'OPTIONS'],
  })
)

const handler = async (req, res) => {
  await cors(req, res)

  // Only allow GET
  if (req.method !== 'POST') {
    return res.status(403).json({})
  }

  // Only allow authenticated requests
  if (req.headers['x-internal-mentors-api-auth-token'] !== process.env.INTERTNAL_MENTORS_API) {
    return res.status(403).json({})
  }

  if (req.query?.force_reset_cache) {
    await refresh()
    return res.status(200).json({ success: true })
  }

  const result = await getMentors({
    only_visible: req.body?.only_visible,
    show_hidden: req.body?.show_hidden,
    id: req.query?.id,
    slug: req.query?.slug,
    rec: req.query?.rec,
  })

  if (req.query?.id || req.query?.slug || req.query?.rec) {
    return result ? res.status(200).json(result[0]) : res.status(404).json()
  } else {
    return result
  }
}

export default handler

export async function getMentors(params) {
  let result = mentorsCache.get('main')
  if (result == undefined) {
    result = await refresh()
  }

  if (params.only_visible) {
    result = result.filter((m) => m.isVisible)
  }

  if (params.show_hidden) {
    result = result.map((m) => {
      return {
        ...m,
        authToken: m[AUTH_TOKEN],
        calendarUrl: m[CALENDAR_URL],
      }
    })
  }

  if (params.drop_long_fields) {
    result = result.map( ({about, description, ...m}) => m)
  }

  if (params.id) {
    const id = parseInt(params.id, 10)
    result = result.filter((m) => m.id === id)
    result = result.length === 1 ? result : undefined
  } else if (params.slug) {
    result = result.filter((m) => m.slug === params.slug)
    result = result.length === 1 ? result : undefined
  } else if (params.rec) {
    result = result.filter((m) => m.airtableId === params.rec)
    result = result.length === 1 ? result : undefined
  }

  return result
}

async function refresh(key, value) {
  const mentors = await getMentorsFromData(true)
  mentorsCache.del('main')
  mentorsCache.set('main', mentors)
  return mentors
}
