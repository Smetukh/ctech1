import request from 'request-promise-native';

const oldToken = '';

const url = `https://admin.threekit.com/api/accesstokens`;

const headers = {
  Authorization: `Bearer 885057b0-dd86-41ac-8734-e854e2357737`,
};

const whitelist = [
  'ctech-staging.herokuapp.com',
  'ctech.mythreekit.dev',
  'configurator.ctechmanufacturing.com',
  'ctechmfgstage.wpengine.com',
  'ctechmfgdev.wpengine.com',
  'configurator.ctechmanufacturing.local',
  'www.ctechmanufacturing.local',
  'ctechmanufacturing.local',
  'www.configurator.ctechmanufacturing.com',
  'ctmprod.wpengine.com',
  'ctmstage.wpengine.com',
  'ctmdev.wpengine.com'
];

const body = {
  name: 'Cabinet Configurator Test Site & CTech Integration',
  permissions: 'public',
  domains: whitelist,
  orgId: '0f33898b-1ed8-4ae9-ae3f-2699f6380d0e' // '4053dba0-a059-4e19-a0af-c46941af8a3b',
};

async function main() {
  if (oldToken) {
    console.log('Deleting previous token', oldToken);
    await request({
      method: 'delete',
      url: `${url}/${oldToken}`,
      headers,
    });
  }

  console.log('Creating new token', body.name);
  const { id, name } = await request({
    method: 'post',
    url,
    headers,
    json: true,
    body,
  });

  console.log('Done creating token with id:', id);
}

main();
