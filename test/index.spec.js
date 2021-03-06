import test from 'ava'
import Serverless from 'serverless'
import proxyquire from 'proxyquire'
import ServerlessCFVariables from '../src'

function buildSls(serverlessCFVariables) {
  const sls = new Serverless()
  sls.pluginManager.addPlugin(serverlessCFVariables)
  sls.init()
  return sls

}

test('Variables are passed through', async t => {
  const sls = buildSls(ServerlessCFVariables)
  sls.service.custom.myVar = 'myVar'
  sls.service.custom.myResoledVar = '${self:custom.myVar}' // eslint-disable-line

  await sls.variables.populateService()
  t.is(sls.service.custom.myResoledVar, 'myVar')
})

test('Correctly parses vars', async t => {
  var serverlessCFVariables = proxyquire.noCallThru()('../src', {
    './awsVars': {
      getValueFromCF: (region, stack, variables) => {
        return `region:${region},stack:${stack},variables:${variables}`
      }
    }
  })
  const sls = buildSls(serverlessCFVariables)
  sls.service.custom.myResoledVar = '${cfcr:region:servicename:ServiceEndpoint}' // eslint-disable-lin
  await sls.variables.populateService()
  t.is(sls.service.custom.myResoledVar, 'region:region,stack:servicename,variables:ServiceEndpoint')
})

test('Correctly throws an error on incorrect syntax', async t => {
  const sls = buildSls(ServerlessCFVariables)
  sls.service.custom.myResoledVar = '${cfcr:region:servicename}' // eslint-disable-lin
  // await sls.variables.populateService()
  await t.throws(() => sls.variables.populateService(), /Invalid syntax, must be cfcr:region:service:output got/)
})

test('Returns an error if var can`t be found', async t => {
  var serverlessCFVariables = proxyquire.noCallThru()('../src', {
    './awsVars': {
      getValueFromCF: (region, stack, variables) => {
        throw Error()
      }
    }
  })
  const sls = buildSls(serverlessCFVariables)
  sls.service.custom.myResoledVar = '${cfcr:region:servicename:ServiceEndpointWillBeUndefined}' // eslint-disable-lin
  let result = await sls.variables.populateService();
  t.true(typeof sls.service.custom.myResoledVar === 'undefined');
})



test('Correctly parses ssm vars', async t => {
  var serverlessCFVariables = proxyquire.noCallThru()('../src', {
    './awsVars': {
      getValueSSMCR: (region, variables) => {
        return `region:${region},variables:${variables}`
      }
    }
  })
  const sls = buildSls(serverlessCFVariables)
  sls.service.custom.myResoledVar = '${ssmcr:region:name}' // eslint-disable-lin
  await sls.variables.populateService()
  t.is(sls.service.custom.myResoledVar, 'region:region,variables:name')
})