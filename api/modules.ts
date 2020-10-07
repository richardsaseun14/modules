import { Octokit } from '@octokit/rest'
import got from 'got'
import { readModules } from '../scripts/module'

const rand = (min, max) => min + Math.round((Math.random() * (max - min)))

module.exports = async (req, res) => {
  const nuxtModules = await readModules()

  if (process.env.GITHUB_TOKEN) {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
    await Promise.all(nuxtModules.map(async (module) => {
      if (module.type !== 'module') return
      module['downloads'] = 0
      try {
        const body = await got(`https://api.npmjs.org/downloads/point/last-month/${module.npm}`).json()
        module['downloads'] = body['downloads']
      } catch (err) {
        console.error(`Could not fetch NPM stats for ${module.npm}`, err.message)
      }
      try {
        const [owner, repo] = module.repo.split('#')[0].split('/')
        const { data } = await octokit.repos.get({ owner, repo })
        module['stars'] = data.stargazers_count || 0
      } catch (err) {
        console.error(`Could not fetch GitHub stars for ${module.repo}`, err.message)
      }
    }))
  } else {
    for (const module of nuxtModules) {
      module['downloads'] = rand(0, 500)
      module['stars'] = rand(0, 2000)
    }
  }

  res.setHeader('Cache-Control', 'max-age=0, s-maxage=600')
  res.end(JSON.stringify(nuxtModules, null, 2))
}
