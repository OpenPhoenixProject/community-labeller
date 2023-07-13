import * as core from '@actions/core'
import {GitHubClient} from './github'

/* When an issue or pull request is opened we want to look at the associated user and
see if they are a member of the X organisations and Y teams. If they are not we should
label the issue with the label `community`. */
export async function run(): Promise<void> {
  try {
    core.info('Starting community labeller')
    // Retrieve our inputs
    const labelName = core.getInput('label_name', {required: true})
    const labelColor = core.getInput('label_color', {required: true})
    const loginsToIgnore = core.getInput('logins_to_ignore', {required: false})
    const failIfMember = core.getInput('fail_if_member', {required: false})
    const orgs = getOrgMembershipList()
    const token = core.getInput('token', {required: true})
    const client = new GitHubClient(token)
    const labels = client.getLabels()
    const missingCommunityLabel = labels && !labels.includes(labelName)

    if (
      (await client.checkOrgMembership(orgs)) ||
      client.isExcludedLogin(loginsToIgnore)
    ) {
      if (failIfMember === 'true' && !labels) {
        core.setFailed('The PR is missing a label!')
      } else {
        core.info("Looks like this issue doesn't need labeling! 👍")
      }
      return
    }

    if (missingCommunityLabel) {
      core.setFailed('Community PRs must be labelled')
      return
    }

    await client.createLabel(labelName, labelColor)
    await client.addLabel(labelName)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

/* getOrgMembershipList() returns a clean list of orgs that were passed in
as a comma separated string. */
export function getOrgMembershipList(): string[] {
  const orgs = core.getInput('org_membership', {required: true})
  const sanitised = orgs.replace(/\s/g, '')
  return sanitised.split(',')
}

run()
