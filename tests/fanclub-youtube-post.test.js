'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {youtubeVideoId}=require('../fan-clubs-71');

test('YouTube links for Fanclub posts',()=>{
 const id='dQw4w9WgXcQ';
 for(const link of [
  'https://www.youtube.com/watch?v='+id,
  'https://youtu.be/'+id,
  'https://youtube.com/shorts/'+id,
  'https://youtube.com/live/'+id,
  'https://m.youtube.com/watch?v='+id,
  'https://music.youtube.com/watch?v='+id,
  'https://www.youtube-nocookie.com/embed/'+id
 ])assert.equal(youtubeVideoId(link),id,link);
 for(const link of [
  'http://youtube.com/watch?v='+id,
  'https://youtube.com.evil.invalid/watch?v='+id,
  'https://www.youtube.com/playlist?list=PL123',
  'https://youtube.com/watch?v=invalid',
  'https://evil.test/youtube.com/watch?v='+id,
  'https://attacker@youtube.com/watch?v='+id,
  'javascript:alert(1)',
  'https://www.youtube.com/watch?v='+id+'broken'
 ])assert.equal(youtubeVideoId(link),null,link);
 assert.equal(youtubeVideoId(''),'');
 assert.equal(youtubeVideoId(undefined),'');
});
