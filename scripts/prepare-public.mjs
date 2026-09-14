import { cpSync, mkdirSync, rmSync } from 'node:fs'
// Stage only the reviewed public landing assets; never package admin assets.
const destination = new URL('../dist-public/', import.meta.url)
rmSync(destination, { recursive: true, force: true })
mkdirSync(destination, { recursive: true })
cpSync(new URL('../public/landing/', import.meta.url), new URL('landing/', destination), { recursive: true })
