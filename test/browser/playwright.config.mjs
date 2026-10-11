import {defineConfig} from '@playwright/test';
import path from 'node:path';
const output=process.env.OPEN_DECADE_TEST_OUTPUT??path.resolve('test-results/browser');
export default defineConfig({
 testDir:'.',testMatch:'*.spec.mjs',workers:1,timeout:30000,retries:0,forbidOnly:true,
 outputDir:path.join(output,'artifacts'),
 reporter:[['list'],['html',{outputFolder:path.join(output,'html'),open:'never'}],['json',{outputFile:path.join(output,'results.json')}]],
 use:{browserName:'chromium',headless:true,trace:'retain-on-failure',screenshot:'only-on-failure'}
});
