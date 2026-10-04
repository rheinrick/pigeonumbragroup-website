import {babyOverview} from '../worker/baby-horoscope.js'
const result=await babyOverview()
console.log(JSON.stringify(result,null,2))
const canonical=result.surfaces[0]
// Candidate policy: canonical stays a clean, labelled, non-indexed beta.
if (result.surfaces.some(surface=>surface.status!=='observed') || canonical.release?.dirty || canonical.release?.mode!=='beta' || canonical.release?.indexing!=='disabled') process.exitCode=1
