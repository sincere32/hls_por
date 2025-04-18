import chai from 'chai';
import sinonChai from 'sinon-chai';
import { LoadStats } from '../../../src/loader/load-stats';
import M3U8Parser from '../../../src/loader/m3u8-parser';
import { PlaylistLevelType } from '../../../src/types/loader';
import { AttrList } from '../../../src/utils/attr-list';
import type { Fragment, Part } from '../../../src/loader/fragment';
import type { LevelKey } from '../../../src/loader/level-key';

chai.use(sinonChai);
chai.config.truncateThreshold = 0;
const expect = chai.expect;

describe('M3U8Parser', function () {
  it('parses empty manifest returns empty array', function () {
    const result = M3U8Parser.parseMasterPlaylist(
      '',
      'http://www.dailymotion.com',
    );
    expect(result.levels).to.deep.equal([]);
    expect(result.sessionData).to.equal(null);
    expectPlaylistParsingError(result, 'no levels found in manifest');
  });

  it('manifest with broken syntax returns empty array', function () {
    const manifest = `#EXTXSTREAMINF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;
    const result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://www.dailymotion.com',
    );
    expect(result.levels).to.deep.equal([]);
    expect(result.sessionData).to.equal(null);
    expectPlaylistParsingError(result, 'no levels found in manifest');
  });

  it('parses manifest with one level', function () {
    const manifest = `#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

    const result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://www.dailymotion.com',
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.levels).to.have.lengthOf(1);
    expect(result.levels[0].bitrate).to.equal(836280);
    expect(result.levels[0].audioCodec).to.equal('mp4a.40.2');
    expect(result.levels[0].videoCodec).to.equal('avc1.64001f');
    expect(result.levels[0].width).to.equal(848);
    expect(result.levels[0].height).to.equal(360);
    expect(result.levels[0].name).to.equal('480');
    expect(result.levels[0].url).to.equal(
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
    );
    expect(result.sessionData).to.equal(null);
  });

  it('parses manifest containing comment', function () {
    const manifest = `#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
# some comment
http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

    const result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://www.dailymotion.com',
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.levels).to.have.lengthOf(1);
    expect(result.levels[0].url).to.equal(
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
    );
  });

  it('parses manifest without codecs', function () {
    const manifest = `#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,RESOLUTION=848x360,NAME="480"
http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

    const result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://www.dailymotion.com',
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.levels.length).to.equal(1);
    expect(result.levels[0].bitrate).to.equal(836280);
    expect(result.levels[0].audioCodec).to.not.exist;
    expect(result.levels[0].videoCodec).to.not.exist;
    expect(result.levels[0].width).to.equal(848);
    expect(result.levels[0].height).to.equal(360);
    expect(result.levels[0].name).to.equal('480');
    expect(result.levels[0].url).to.equal(
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
    );
    expect(result.sessionData).to.equal(null);
  });

  it('does not care about the attribute order', function () {
    let manifest = `#EXTM3U
#EXT-X-STREAM-INF:NAME="480",PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360
http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

    let result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://www.dailymotion.com',
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.levels.length).to.equal(1);
    expect(result.levels[0].bitrate).to.equal(836280);
    expect(result.levels[0].audioCodec).to.equal('mp4a.40.2');
    expect(result.levels[0].videoCodec).to.equal('avc1.64001f');
    expect(result.levels[0].width).to.equal(848);
    expect(result.levels[0].height).to.equal(360);
    expect(result.levels[0].name).to.equal('480');
    expect(
      result.levels[0].url,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
    );
    expect(result.sessionData).to.equal(null);

    manifest = `#EXTM3U
#EXT-X-STREAM-INF:NAME="480",RESOLUTION=848x360,PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f"
http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

    result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://www.dailymotion.com',
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.levels.length).to.equal(1);
    expect(result.levels[0].bitrate).to.equal(836280);
    expect(result.levels[0].audioCodec).to.equal('mp4a.40.2');
    expect(result.levels[0].videoCodec).to.equal('avc1.64001f');
    expect(result.levels[0].width).to.equal(848);
    expect(result.levels[0].height).to.equal(360);
    expect(result.levels[0].name).to.equal('480');
    expect(result.levels[0].url).to.equal(
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
    );
    expect(result.sessionData).to.equal(null);

    manifest = `#EXTM3U
#EXT-X-STREAM-INF:CODECS="mp4a.40.2,avc1.64001f",NAME="480",RESOLUTION=848x360,PROGRAM-ID=1,BANDWIDTH=836280
http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

    result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://www.dailymotion.com',
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.levels).to.have.lengthOf(1);
    expect(result.levels[0].bitrate).to.equal(836280);
    expect(result.levels[0].audioCodec).to.equal('mp4a.40.2');
    expect(result.levels[0].videoCodec).to.equal('avc1.64001f');
    expect(result.levels[0].width).to.equal(848);
    expect(result.levels[0].height).to.equal(360);
    expect(result.levels[0].name).to.equal('480');
    expect(result.levels[0].url).to.equal(
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
    );
    expect(result.sessionData).to.equal(null);
  });

  it('parses manifest with 10 levels', function () {
    const manifest = `#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-21.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=246440,CODECS="mp4a.40.5,avc1.42000d",RESOLUTION=320x136,NAME="240"
http://proxy-62.dailymotion.com/sec(65b989b17536b5158360dfc008542daa)/video/107/282/158282701_mp4_h264_aac_ld.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=246440,CODECS="mp4a.40.5,avc1.42000d",RESOLUTION=320x136,NAME="240"
http://proxy-21.dailymotion.com/sec(65b989b17536b5158360dfc008542daa)/video/107/282/158282701_mp4_h264_aac_ld.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=460560,CODECS="mp4a.40.5,avc1.420016",RESOLUTION=512x216,NAME="380"
http://proxy-62.dailymotion.com/sec(b90a363ba42fd9eab9313f0cd2e4d38b)/video/107/282/158282701_mp4_h264_aac.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=460560,CODECS="mp4a.40.5,avc1.420016",RESOLUTION=512x216,NAME="380"
http://proxy-21.dailymotion.com/sec(b90a363ba42fd9eab9313f0cd2e4d38b)/video/107/282/158282701_mp4_h264_aac.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2149280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=1280x544,NAME="720"
http://proxy-62.dailymotion.com/sec(c16ad76fb8641c41d759e20880043e47)/video/107/282/158282701_mp4_h264_aac_hd.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2149280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=1280x544,NAME="720"
http://proxy-21.dailymotion.com/sec(c16ad76fb8641c41d759e20880043e47)/video/107/282/158282701_mp4_h264_aac_hd.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=6221600,CODECS="mp4a.40.2,avc1.640028",RESOLUTION=1920x816,NAME="1080"
http://proxy-62.dailymotion.com/sec(2a991e17f08fcd94f95637a6dd718ddd)/video/107/282/158282701_mp4_h264_aac_fhd.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=6221600,CODECS="mp4a.40.2,avc1.640028",RESOLUTION=1920x816,NAME="1080"
http://proxy-21.dailymotion.com/sec(2a991e17f08fcd94f95637a6dd718ddd)/video/107/282/158282701_mp4_h264_aac_fhd.m3u8#cell=core`;

    const result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://www.dailymotion.com',
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.levels.length).to.equal(10);
    expect(result.levels[0].bitrate).to.equal(836280);
    expect(result.levels[1].bitrate).to.equal(836280);
    expect(result.levels[2].bitrate).to.equal(246440);
    expect(result.levels[3].bitrate).to.equal(246440);
    expect(result.levels[4].bitrate).to.equal(460560);
    expect(result.levels[5].bitrate).to.equal(460560);
    expect(result.levels[6].bitrate).to.equal(2149280);
    expect(result.levels[7].bitrate).to.equal(2149280);
    expect(result.levels[8].bitrate).to.equal(6221600);
    expect(result.levels[9].bitrate).to.equal(6221600);
    expect(result.sessionData).to.equal(null);
  });

  it('parses manifest with EXT-X-SESSION-DATA', function () {
    const manifest = `#EXTM3U
#EXT-X-SESSION-DATA:DATA-ID="com.dailymotion.sessiondata.test",VALUE="some data"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

    const result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://www.dailymotion.com',
    );
    expect(result.playlistParsingError).to.be.null;
    const expected = {
      'com.dailymotion.sessiondata.test': new AttrList({
        'DATA-ID': 'com.dailymotion.sessiondata.test',
        VALUE: 'some data',
      }),
    };
    expect(result.sessionData).to.deep.equal(expected);
    expect(result.levels.length).to.equal(1);
  });

  it('parses manifest with EXT-X-SESSION-DATA and 10 levels', function () {
    const manifest = `#EXTM3U
#EXT-X-SESSION-DATA:DATA-ID="com.dailymotion.sessiondata.test",VALUE="some data"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-21.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=246440,CODECS="mp4a.40.5,avc1.42000d",RESOLUTION=320x136,NAME="240"
http://proxy-62.dailymotion.com/sec(65b989b17536b5158360dfc008542daa)/video/107/282/158282701_mp4_h264_aac_ld.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=246440,CODECS="mp4a.40.5,avc1.42000d",RESOLUTION=320x136,NAME="240"
http://proxy-21.dailymotion.com/sec(65b989b17536b5158360dfc008542daa)/video/107/282/158282701_mp4_h264_aac_ld.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=460560,CODECS="mp4a.40.5,avc1.420016",RESOLUTION=512x216,NAME="380"
http://proxy-62.dailymotion.com/sec(b90a363ba42fd9eab9313f0cd2e4d38b)/video/107/282/158282701_mp4_h264_aac.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=460560,CODECS="mp4a.40.5,avc1.420016",RESOLUTION=512x216,NAME="380"
http://proxy-21.dailymotion.com/sec(b90a363ba42fd9eab9313f0cd2e4d38b)/video/107/282/158282701_mp4_h264_aac.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2149280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=1280x544,NAME="720"
http://proxy-62.dailymotion.com/sec(c16ad76fb8641c41d759e20880043e47)/video/107/282/158282701_mp4_h264_aac_hd.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2149280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=1280x544,NAME="720"
http://proxy-21.dailymotion.com/sec(c16ad76fb8641c41d759e20880043e47)/video/107/282/158282701_mp4_h264_aac_hd.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=6221600,CODECS="mp4a.40.2,avc1.640028",RESOLUTION=1920x816,NAME="1080"
http://proxy-62.dailymotion.com/sec(2a991e17f08fcd94f95637a6dd718ddd)/video/107/282/158282701_mp4_h264_aac_fhd.m3u8#cell=core
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=6221600,CODECS="mp4a.40.2,avc1.640028",RESOLUTION=1920x816,NAME="1080"
http://proxy-21.dailymotion.com/sec(2a991e17f08fcd94f95637a6dd718ddd)/video/107/282/158282701_mp4_h264_aac_fhd.m3u8#cell=core`;

    const result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://www.dailymotion.com',
    );
    expect(result.playlistParsingError).to.be.null;
    const expected = {
      'com.dailymotion.sessiondata.test': new AttrList({
        'DATA-ID': 'com.dailymotion.sessiondata.test',
        VALUE: 'some data',
      }),
    };
    expect(result.sessionData).to.deep.equal(expected);
    expect(result.levels.length).to.equal(10);
  });

  it('parses CODECS and SUPPLEMENTAL-CODECS', function () {
    const manifest = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=3000000,VIDEO-RANGE=PQ,CODECS="hvc1.2.4.L93.b0,ec-3",SUPPLEMENTAL-CODECS="dvh1.08.01/db1p",RESOLUTION=1920x1080,FRAME-RATE=30.000
db1p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3602443,VIDEO-RANGE=HLG,CODECS="hvc1.2.4.L150,ec-3",SUPPLEMENTAL-CODECS="dvh1.08.07/db4h",RESOLUTION=1920x1080,FRAME-RATE=30.000
db4h.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3000000,VIDEO-RANGE=HLG,CODECS="av01.0.13M.10.0.112,ec-3",SUPPLEMENTAL-CODECS="dav1.10.09/db4h",RESOLUTION=1920x1080,FRAME-RATE=30.000
dav1.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3602443,VIDEO-RANGE=PQ,CODECS="av01.0.05M.10.0.112,ec-3",SUPPLEMENTAL-CODECS="av01.0.05M.10.0.112/cdm4",RESOLUTION=1920x1080,FRAME-RATE=30.000
cdm4.m3u8`;
    const result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://example.com',
    );
    expect(result, JSON.stringify(result, null, 2)).to.deep.include({
      contentSteering: null,
      playlistParsingError: null,
      sessionData: null,
      sessionKeys: null,
      startTimeOffset: null,
      variableList: null,
      hasVariableRefs: false,
    });
    expect(result.levels).to.be.an('array').with.lengthOf(4);
    // Note that while brand ("db1p", "db4h", "cdm4") is not available in `Level.supplemental` is is available on parsed attributes:
    expect(result.levels[0].attrs).to.deep.include({
      'SUPPLEMENTAL-CODECS': 'dvh1.08.01/db1p',
    });
    expect(result.levels[1].attrs).to.deep.include({
      'SUPPLEMENTAL-CODECS': 'dvh1.08.07/db4h',
    });
    expect(result.levels[2].attrs).to.deep.include({
      'SUPPLEMENTAL-CODECS': 'dav1.10.09/db4h',
    });
    expect(result.levels[3].attrs).to.deep.include({
      'SUPPLEMENTAL-CODECS': 'av01.0.05M.10.0.112/cdm4',
    });
    const levelsExpectedToInclude = [
      {
        bitrate: 3000000,
        url: 'http://example.com/db1p.m3u8',
        width: 1920,
        height: 1080,
        videoCodec: 'hvc1.2.4.L93.b0',
        audioCodec: 'ec-3',
        unknownCodecs: [],
        supplemental: {
          videoCodec: 'dvh1.08.01',
          unknownCodecs: [],
        },
      },
      {
        bitrate: 3602443,
        url: 'http://example.com/db4h.m3u8',
        width: 1920,
        height: 1080,
        videoCodec: 'hvc1.2.4.L150',
        audioCodec: 'ec-3',
        unknownCodecs: [],
        supplemental: {
          videoCodec: 'dvh1.08.07',
          unknownCodecs: [],
        },
      },
      {
        bitrate: 3000000,
        url: 'http://example.com/dav1.m3u8',
        width: 1920,
        height: 1080,
        videoCodec: 'av01.0.13M.10.0.112',
        audioCodec: 'ec-3',
        unknownCodecs: [],
        supplemental: {
          videoCodec: 'dav1.10.09',
          unknownCodecs: [],
        },
      },
      {
        bitrate: 3602443,
        url: 'http://example.com/cdm4.m3u8',
        width: 1920,
        height: 1080,
        videoCodec: 'av01.0.05M.10.0.112',
        audioCodec: 'ec-3',
        unknownCodecs: [],
        supplemental: {
          videoCodec: 'av01.0.05M.10.0.112',
          unknownCodecs: [],
        },
      },
    ];
    result.levels.forEach((level, i) => {
      expect(level, `level ${i + 1}/${result.levels.length}`).to.deep.include(
        levelsExpectedToInclude[i],
      );
    });
  });

  it('parses manifest with multiple EXT-X-SESSION-DATA', function () {
    const manifest = `#EXTM3U
#EXT-X-SESSION-DATA:DATA-ID="com.dailymotion.sessiondata.test",VALUE="some data"
#EXT-X-SESSION-DATA:DATA-ID="com.dailymotion.sessiondata.test2",VALUE="different data"
#EXT-X-SESSION-DATA:DATA-ID="com.dailymotion.sessiondata.test3",VALUE="more different data",URI="http://www.dailymotion.com/"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

    const result = M3U8Parser.parseMasterPlaylist(
      manifest,
      'http://www.dailymotion.com',
    );
    expect(result.playlistParsingError).to.be.null;
    const { sessionData } = result;
    const expected = {
      'com.dailymotion.sessiondata.test': new AttrList({
        'DATA-ID': 'com.dailymotion.sessiondata.test',
        VALUE: 'some data',
      }),
      'com.dailymotion.sessiondata.test2': new AttrList({
        'DATA-ID': 'com.dailymotion.sessiondata.test2',
        VALUE: 'different data',
      }),
      'com.dailymotion.sessiondata.test3': new AttrList({
        'DATA-ID': 'com.dailymotion.sessiondata.test3',
        VALUE: 'more different data',
        URI: 'http://www.dailymotion.com/',
      }),
    };
    expect(sessionData).to.deep.equal(expected);
  });

  it('parses empty levels returns empty fragment array', function () {
    const level = '';
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.fragments).to.have.lengthOf(0);
    expect(result.totalduration).to.equal(0);
    expect(result.variableList).to.equal(null);
    expectPlaylistParsingError(result, 'Missing format identifier #EXTM3U');
  });

  it('level with 0 frag returns empty fragment array', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-TARGETDURATION:14`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments).to.have.lengthOf(0);
    expect(result.totalduration).to.equal(0);
  });

  it('TARGETDURATION is a decimal-integer', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-TARGETDURATION:2.5`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.targetduration).to.equal(2);
  });

  it('TARGETDURATION is a decimal-integer which HLS.js assigns a minimum value of 1', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-TARGETDURATION:0.5`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.targetduration).to.equal(1);
  });

  it('parse level with several fragments', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-TARGETDURATION:14
#EXTINF:11.360,
/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(1)/video/107/282/158282701_mp4_h264_aac_hq.ts
#EXTINF: 11.320,
/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(2)/video/107/282/158282701_mp4_h264_aac_hq.ts
#EXTINF: 13.480,
# general comment
/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(3)/video/107/282/158282701_mp4_h264_aac_hq.ts
#EXTINF:11.200,
/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(4)/video/107/282/158282701_mp4_h264_aac_hq.ts
#EXTINF:3.880,
/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(5)/video/107/282/158282701_mp4_h264_aac_hq.ts
#EXT-X-ENDLIST`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.variableList).to.equal(null);
    expect(result.totalduration).to.equal(51.24);
    expect(result.startSN).to.equal(0);
    expect(result.version).to.equal(3);
    expect(result.type).to.equal('VOD');
    expect(result.targetduration).to.equal(14);
    expect(result.live).to.be.false;
    expect(result.fragments).to.have.lengthOf(5);
    expect(result.fragments[0].cc).to.equal(0);
    expect(result.fragments[0].duration).to.equal(11.36);
    expect(result.fragments[1].duration).to.equal(11.32);
    expect(result.fragments[2].duration).to.equal(13.48);
    expect(result.fragments[4].sn).to.equal(4);
    expect(result.fragments[0].level).to.equal(0);
    expect(result.fragments[4].cc).to.equal(0);
    expect(result.fragments[4].sn).to.equal(4);
    expect(result.fragments[4].start).to.equal(47.36);
    expect(result.fragments[4].duration).to.equal(3.88);
    expect(result.fragments[4].url).to.equal(
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(5)/video/107/282/158282701_mp4_h264_aac_hq.ts',
    );
  });

  it('parse level with single char fragment URI', function () {
    const level = `#EXTM3U
#EXT-X-ALLOW-CACHE:NO
#EXT-X-TARGETDURATION:2
#EXTINF:2,
0
#EXTINF:2,
1
#EXT-X-ENDLIST`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(5)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.totalduration).to.equal(4);
    expect(result.startSN).to.equal(0);
    expect(result.targetduration).to.equal(2);
    expect(result.live).to.be.false;
    expect(result.fragments).to.have.lengthOf(2);
    expect(result.fragments[0].cc).to.equal(0);
    expect(result.fragments[0].duration).to.equal(2);
    expect(result.fragments[0].sn).to.equal(0);
    expect(result.fragments[0].relurl).to.equal('0');
    expect(result.fragments[1].cc).to.equal(0);
    expect(result.fragments[1].duration).to.equal(2);
    expect(result.fragments[1].sn).to.equal(1);
    expect(result.fragments[1].relurl).to.equal('1');
  });

  it('parse level with unicode white-space in fragment URI', function () {
    const uriWithIrregularWs0 = 'sample-mp4-file\u3000_240p_00000.ts';
    const uriWithIrregularWs1 = 'sample-mp4-file\u3000_another\u3000_00001.ts';
    const level = `#EXTM3U
#EXT-X-ALLOW-CACHE:NO
#EXT-X-TARGETDURATION:2
#EXTINF:2,
${uriWithIrregularWs0}
#EXTINF:2,
${uriWithIrregularWs1}
#EXT-X-ENDLIST`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(5)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments).to.have.lengthOf(2);
    expect(result.fragments[0].relurl).to.equal(uriWithIrregularWs0);
    expect(result.fragments[1].relurl).to.equal(uriWithIrregularWs1);
  });

  it('parse level with EXTINF line without comma', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-TARGETDURATION:6
#EXT-X-INDEPENDENT-SEGMENTS
#EXTINF:6.000000
chop/segment-1.ts
#EXTINF:6.000000
chop/segment-2.ts
#EXTINF:6.000000
chop/segment-3.ts
#EXTINF:6.000000
chop/segment-4.ts
#EXTINF:6.000000
chop/segment-5.ts
#EXTINF:6.000000
#EXT-X-ENDLIST`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(5)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.totalduration).to.equal(30);
    expect(result.startSN).to.equal(0);
    expect(result.version).to.equal(3);
    expect(result.targetduration).to.equal(6);
    expect(result.live).to.be.false;
    expect(result.fragments).to.have.lengthOf(5);
    expect(result.fragments[0].cc).to.equal(0);
    expect(result.fragments[0].duration).to.equal(6);
    expect(result.fragments[4].sn).to.equal(4);
    expect(result.fragments[0].level).to.equal(0);
    expect(result.fragments[4].cc).to.equal(0);
    expect(result.fragments[4].sn).to.equal(4);
    expect(result.fragments[4].start).to.equal(24);
    expect(result.fragments[4].duration).to.equal(6);
    expect(result.fragments[4].url).to.equal(
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(5)/video/107/282/chop/segment-5.ts',
    );
  });

  it('parse level with start time offset', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-TARGETDURATION:14
#EXT-X-START:TIME-OFFSET=10.3
#EXTINF:11.360,
/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(1)/video/107/282/158282701_mp4_h264_aac_hq.ts
#EXTINF:11.320,
/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(2)/video/107/282/158282701_mp4_h264_aac_hq.ts
#EXTINF:13.480,
/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(3)/video/107/282/158282701_mp4_h264_aac_hq.ts
#EXTINF:11.200,
/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(4)/video/107/282/158282701_mp4_h264_aac_hq.ts
#EXTINF:3.880,
/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(5)/video/107/282/158282701_mp4_h264_aac_hq.ts
#EXT-X-ENDLIST`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.totalduration).to.equal(51.24);
    expect(result.startSN).to.equal(0);
    expect(result.targetduration).to.equal(14);
    expect(result.live).to.be.false;
    expect(result.startTimeOffset).to.equal(10.3);
  });

  it('parse AES encrypted URLS, with a com.apple.streamingkeydelivery KEYFORMAT', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:1
## Created with Unified Streaming Platform(version=1.6.7)
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-ALLOW-CACHE:NO
#EXT-X-TARGETDURATION:11
#EXT-X-KEY:METHOD=AES-128,URI="skd://assetid?keyId=1234",KEYFORMAT="com.apple.streamingkeydelivery"
#EXTINF:11,no desc
oceans_aes-audio=65000-video=236000-1.ts
#EXTINF:7,no desc
oceans_aes-audio=65000-video=236000-2.ts
#EXTINF:7,no desc
oceans_aes-audio=65000-video=236000-3.ts
#EXT-X-ENDLIST`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://foo.com/adaptive/oceans_aes/oceans_aes.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.totalduration).to.equal(25);
    expect(result.startSN).to.equal(1);
    expect(result.targetduration).to.equal(11);
    expect(result.live).to.be.false;
    expect(result.fragments).to.have.lengthOf(3);
    expect(result.fragments[0].cc).to.equal(0);
    expect(result.fragments[0].duration).to.equal(11);
    expect(result.fragments[0].title).to.equal('no desc');
    expect(result.fragments[0].level).to.equal(0);
    expect(result.fragments[0].url).to.equal(
      'http://foo.com/adaptive/oceans_aes/oceans_aes-audio=65000-video=236000-1.ts',
    );
    expectWithJSONMessage(
      result.fragments[0].levelkeys?.['com.apple.streamingkeydelivery'],
      'levelkeys',
    ).to.deep.include({
      uri: 'skd://assetid?keyId=1234',
      method: 'AES-128',
      keyFormat: 'com.apple.streamingkeydelivery',
      keyFormatVersions: [1],
      iv: null,
      key: null,
      keyId: null,
    });
  });

  it('parse AES encrypted URLs, with implicit IV', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:1
## Created with Unified Streaming Platform(version=1.6.7)
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-ALLOW-CACHE:NO
#EXT-X-TARGETDURATION:11
#EXT-X-KEY:METHOD=AES-128,URI="oceans.key"
#EXTINF:11,no desc
oceans_aes-audio=65000-video=236000-1.ts
#EXTINF:7,no desc
oceans_aes-audio=65000-video=236000-2.ts
#EXTINF:7,no desc
oceans_aes-audio=65000-video=236000-3.ts
#EXT-X-ENDLIST`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://foo.com/adaptive/oceans_aes/oceans_aes.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.totalduration).to.equal(25);
    expect(result.startSN).to.equal(1);
    expect(result.targetduration).to.equal(11);
    expect(result.live).to.be.false;
    expect(result.fragments).to.have.lengthOf(3);
    expect(result.fragments[0].cc).to.equal(0);
    expect(result.fragments[0].duration).to.equal(11);
    expect(result.fragments[0].title).to.equal('no desc');
    expect(result.fragments[0].level).to.equal(0);
    expect(result.fragments[0].url).to.equal(
      'http://foo.com/adaptive/oceans_aes/oceans_aes-audio=65000-video=236000-1.ts',
    );
    expect(result.fragments[0].decryptdata?.uri).to.equal(
      'http://foo.com/adaptive/oceans_aes/oceans.key',
    );
    expect(result.fragments[0].decryptdata?.method).to.equal('AES-128');
    let sn = 1;
    let uint8View = new Uint8Array(16);
    for (let i = 12; i < 16; i++) {
      uint8View[i] = (sn >> (8 * (15 - i))) & 0xff;
    }
    expect(result.fragments[0].decryptdata?.iv?.buffer).to.deep.equal(
      uint8View.buffer,
    );
    sn = 3;
    uint8View = new Uint8Array(16);
    for (let i = 12; i < 16; i++) {
      uint8View[i] = (sn >> (8 * (15 - i))) & 0xff;
    }
    expect(result.fragments[2].decryptdata?.iv?.buffer).to.deep.equal(
      uint8View.buffer,
    );
  });

  it('parse AES-256 and AES-256-CTR encrypted URLs, with explicit IV', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:1
## Created with Unified Streaming Platform(version=1.6.7)
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-ALLOW-CACHE:NO
#EXT-X-TARGETDURATION:11
#EXT-X-KEY:METHOD=AES-256,URI="bob1.key256",IV=0x10000000000000000000000000001234
#EXTINF:11,no desc
bob_1.m4s
#EXT-X-KEY:METHOD=AES-256-CTR,URI="bob2.key256",IV=0x10000000000000000000000000004567
#EXTINF:11,no desc
bob_2.m4s
#EXT-X-ENDLIST`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://foo.com/stream/bob.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    const ivExpected = new Uint8Array(16);
    ivExpected[0] = 0x10;
    expect(result.playlistParsingError).to.be.null;
    expect(result.totalduration).to.equal(22);
    expect(result.startSN).to.equal(1);
    expect(result.targetduration).to.equal(11);
    expect(result.fragments).to.have.lengthOf(2);
    expect(result.fragments[0].duration).to.equal(11);
    expect(result.fragments[0].url).to.equal('http://foo.com/stream/bob_1.m4s');
    expect(result.fragments[0].decryptdata?.uri).to.equal(
      'http://foo.com/stream/bob1.key256',
    );
    expect(result.fragments[0].decryptdata?.method).to.equal('AES-256');
    ivExpected[14] = 0x12;
    ivExpected[15] = 0x34;
    expect(result.fragments[0].decryptdata?.iv).to.deep.equal(ivExpected);

    expect(result.fragments[1].duration).to.equal(11);
    expect(result.fragments[1].url).to.equal('http://foo.com/stream/bob_2.m4s');
    expect(result.fragments[1].decryptdata?.uri).to.equal(
      'http://foo.com/stream/bob2.key256',
    );
    expect(result.fragments[1].decryptdata?.method).to.equal('AES-256-CTR');
    ivExpected[14] = 0x45;
    ivExpected[15] = 0x67;
    expect(result.fragments[1].decryptdata?.iv).to.deep.equal(ivExpected);
  });

  it('parse level with #EXT-X-BYTERANGE before #EXTINF', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-ALLOW-CACHE:YES
#EXT-X-TARGETDURATION:1
#EXT-X-MEDIA-SEQUENCE:7478
#EXT-X-BYTERANGE:140060@803136
#EXTINF:1000000,
lo007ts
#EXT-X-BYTERANGE:96256@943196
#EXTINF:1000000,
lo007ts
#EXT-X-BYTERANGE:143068@1039452
#EXTINF:1000000,
lo007ts
#EXT-X-BYTERANGE:124080@0
#EXTINF:1000000,
lo008ts
#EXT-X-BYTERANGE:117688@124080
#EXTINF:1000000,
lo008ts
#EXT-X-BYTERANGE:102272@241768
#EXTINF:1000000,
lo008ts
#EXT-X-BYTERANGE:100580@344040
#EXTINF:1000000,
lo008ts
#EXT-X-BYTERANGE:113740@444620
#EXTINF:1000000,
lo008ts
#EXT-X-BYTERANGE:126148@558360
#EXTINF:1000000,
lo008ts
#EXT-X-BYTERANGE:133480@684508
#EXTINF:1000000,
lo008ts`;

    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://dummy.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments.length).to.equal(10);
    expect(result.fragments[0].url).to.equal('http://dummy.com/lo007ts');
    expect(result.fragments[0].byteRangeStartOffset).to.equal(803136);
    expect(result.fragments[0].byteRangeEndOffset).to.equal(943196);
    expect(result.fragments[1].byteRangeStartOffset).to.equal(943196);
    expect(result.fragments[1].byteRangeEndOffset).to.equal(1039452);
    expect(result.fragments[9].url).to.equal('http://dummy.com/lo008ts');
    expect(result.fragments[9].byteRangeStartOffset).to.equal(684508);
    expect(result.fragments[9].byteRangeEndOffset).to.equal(817988);
  });

  it('parse level with #EXT-X-BYTERANGE after #EXTINF', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-ALLOW-CACHE:YES
#EXT-X-TARGETDURATION:1
#EXT-X-MEDIA-SEQUENCE:7478
#EXTINF:1000000,
#EXT-X-BYTERANGE:140060@803136
lo007ts
#EXTINF:1000000,
#EXT-X-BYTERANGE:96256@943196
lo007ts
#EXTINF:1000000,
#EXT-X-BYTERANGE:143068@1039452
lo007ts
#EXTINF:1000000,
#EXT-X-BYTERANGE:124080@0
lo008ts
#EXTINF:1000000,
#EXT-X-BYTERANGE:117688@124080
lo008ts
#EXTINF:1000000,
#EXT-X-BYTERANGE:102272@241768
lo008ts
#EXTINF:1000000,
#EXT-X-BYTERANGE:100580@344040
lo008ts
#EXTINF:1000000,
#EXT-X-BYTERANGE:113740@444620
lo008ts
#EXTINF:1000000,
#EXT-X-BYTERANGE:126148@558360
lo008ts
#EXTINF:1000000,
#EXT-X-BYTERANGE:133480@684508
lo008ts`;

    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://dummy.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments).to.have.lengthOf(10);
    expect(result.fragments[0].url).to.equal('http://dummy.com/lo007ts');
    expect(result.fragments[0].byteRangeStartOffset).to.equal(803136);
    expect(result.fragments[0].byteRangeEndOffset).to.equal(943196);
    expect(result.fragments[1].byteRangeStartOffset).to.equal(943196);
    expect(result.fragments[1].byteRangeEndOffset).to.equal(1039452);
    expect(result.fragments[9].url).to.equal('http://dummy.com/lo008ts');
    expect(result.fragments[9].byteRangeStartOffset).to.equal(684508);
    expect(result.fragments[9].byteRangeEndOffset).to.equal(817988);
  });

  it('parse level with #EXT-X-BYTERANGE before #EXT-X-MAP tag', function () {
    const level = `#EXTM3U
#EXT-X-ALLOW-CACHE:YES
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-BYTERANGE:10000@24000
#EXT-X-MAP:URI="initsegment.m4v",BYTERANGE="24000@0"
#EXTINF:4.000,
lo007.m4v
#EXT-X-BYTERANGE:30000@34000
#EXTINF:4.000,
lo007.m4v
#EXT-X-BYTERANGE:40000@64000
#EXTINF:4.000,
lo007.m4v
#EXT-X-ENDLIST`;

    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://dummy.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments.length).to.equal(3);
    expect(result.fragments[0].initSegment?.url).to.equal(
      'http://dummy.com/initsegment.m4v',
    );
    expect(result.fragments[0].initSegment?.byteRangeStartOffset).to.equal(0);
    expect(result.fragments[0].initSegment?.byteRangeEndOffset).to.equal(
      24000,
      'init end',
    );
    expect(result.fragments[0].url).to.equal('http://dummy.com/lo007.m4v');
    expect(result.fragments[0].byteRangeStartOffset).to.equal(24000, '1 start');
    expect(result.fragments[0].byteRangeEndOffset).to.equal(34000, '1 end');
    expect(result.fragments[1].url).to.equal('http://dummy.com/lo007.m4v');
    expect(result.fragments[1].byteRangeStartOffset).to.equal(34000, '2 start');
    expect(result.fragments[1].byteRangeEndOffset).to.equal(64000, '2 end');
    expect(result.fragments[2].url).to.equal('http://dummy.com/lo007.m4v');
    expect(result.fragments[2].byteRangeStartOffset).to.equal(64000, '3 start');
    expect(result.fragments[2].byteRangeEndOffset).to.equal(104000, '3 end');
  });

  it('parse level with #EXT-X-BYTERANGE without offset', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-ALLOW-CACHE:YES
#EXT-X-TARGETDURATION:1
#EXT-X-MEDIA-SEQUENCE:7478
#EXTINF:1000000,
#EXT-X-BYTERANGE:140060@803136
lo007ts
#EXTINF:1000000,
#EXT-X-BYTERANGE:96256
lo007ts
#EXTINF:1000000,
#EXT-X-BYTERANGE:143068
lo007ts`;

    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://dummy.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments.length).to.equal(3);
    expect(result.fragments[0].url).to.equal('http://dummy.com/lo007ts');
    expect(result.fragments[0].byteRangeStartOffset).to.equal(803136);
    expect(result.fragments[0].byteRangeEndOffset).to.equal(943196);
    expect(result.fragments[1].byteRangeStartOffset).to.equal(943196);
    expect(result.fragments[1].byteRangeEndOffset).to.equal(1039452);
    expect(result.fragments[2].byteRangeStartOffset).to.equal(1039452);
    expect(result.fragments[2].byteRangeEndOffset).to.equal(1182520);
  });

  it('parses discontinuity and maintains continuity counter', function () {
    const level = `#EXTM3U
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10,
0001.ts
#EXTINF:10,
0002.ts
#EXTINF:5,
0003.ts
#EXT-X-DISCONTINUITY
#EXTINF:10,
0005.ts
#EXTINF:10,
0006.ts
#EXT-X-ENDLIST
    `;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://video.example.com/disc.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments).to.have.lengthOf(5);
    expect(result.totalduration).to.equal(45);
    expect(result.fragments[2].cc).to.equal(0);
    expect(result.fragments[3].cc).to.equal(1); // continuity counter should increase around discontinuity
  });

  it('parses correctly EXT-X-DISCONTINUITY-SEQUENCE and increases continuity counter', function () {
    const level = `#EXTM3U
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-DISCONTINUITY-SEQUENCE:20
#EXTINF:10,
0001.ts
#EXTINF:10,
0002.ts
#EXTINF:5,
0003.ts
#EXT-X-DISCONTINUITY
#EXTINF:10,
0005.ts
#EXTINF:10,
0006.ts
#EXT-X-ENDLIST
    `;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://video.example.com/disc.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments).to.have.lengthOf(5);
    expect(result.totalduration).to.equal(45);
    expect(result.fragments[0].cc).to.equal(20);
    expect(result.fragments[2].cc).to.equal(20);
    expect(result.fragments[3].cc).to.equal(21); // continuity counter should increase around discontinuity
  });

  it('parses manifest with one audio track', function () {
    const manifest = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="600k",LANGUAGE="eng",NAME="Audio",AUTOSELECT=YES,DEFAULT=YES,URI="/videos/ZakEbrahim_2014/audio/600k.m3u8?qr=true&preroll=Blank",BANDWIDTH=614400`;
    const result = M3U8Parser.parseMasterPlaylistMedia(
      manifest,
      'https://hls.ted.com/',
      {
        contentSteering: null,
        levels: [],
        playlistParsingError: null,
        sessionData: null,
        sessionKeys: null,
        startTimeOffset: null,
        variableList: null,
        hasVariableRefs: false,
      },
    );
    const { AUDIO = [] } = result;
    expect(AUDIO.length).to.equal(1);
    expect(AUDIO[0].autoselect).to.be.true;
    expect(AUDIO[0].default).to.be.true;
    expect(AUDIO[0].forced).to.be.false;
    expect(AUDIO[0].groupId).to.equal('600k');
    expect(AUDIO[0].lang).to.equal('eng');
    expect(AUDIO[0].name).to.equal('Audio');
    expect(AUDIO[0].url).to.equal(
      'https://hls.ted.com/videos/ZakEbrahim_2014/audio/600k.m3u8?qr=true&preroll=Blank',
    );
  });
  // issue #425 - first fragment has null url and no decryptdata if EXT-X-KEY follows EXTINF
  it('parse level with #EXT-X-KEY after #EXTINF', function () {
    const level = `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:10,
#EXT-X-KEY:METHOD=AES-128,URI="https://dummy.com/crypt-0.key"
0001.ts
#EXTINF:10,
0002.ts
#EXTINF:10,
0003.ts
#EXTINF:10,
0004.ts
#EXTINF:10,
0005.ts
#EXTINF:10,
0006.ts
#EXTINF:10,
0007.ts
#EXTINF:10,
0008.ts`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://dummy.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments).to.have.lengthOf(8);
    expect(result.totalduration).to.equal(80);

    let fragdecryptdata;
    let decryptdata: LevelKey = result.fragments[0].decryptdata as LevelKey;
    let sn = 0;

    result.fragments.forEach(function (fragment, idx) {
      sn = idx + 1;

      expect(fragment.url).to.equal('http://dummy.com/000' + sn + '.ts');

      // decryptdata should persist across all fragments
      fragdecryptdata = fragment.decryptdata;

      expect(decryptdata).to.not.equal(null);
      expect(fragdecryptdata.method).to.equal(decryptdata.method);
      expect(fragdecryptdata.uri).to.equal(decryptdata.uri);
      expect(fragdecryptdata.key).to.equal(decryptdata.key);

      // initialization vector is correctly generated since it wasn't declared in the playlist
      const iv = fragdecryptdata.iv;
      expect(iv[15]).to.equal(idx);

      // hold this decrypt data to compare to the next fragment's decrypt data
      decryptdata = fragment.decryptdata as LevelKey;
    });
  });

  // PR #454 - Add support for custom tags in fragment object
  it('return custom tags in fragment object', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:719926
#EXTINF:9.40,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719926.ts
#EXTINF:9.56,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719927.ts
#EXT-X-CUE-OUT:DURATION=150,BREAKID=0x0
#EXTINF:9.23,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719928.ts
#EXTINF:0.50,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719929.ts
#EXT-X-CUE-IN
#EXTINF:8.50,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719930.ts
#EXTINF:9.43,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719931.ts
#EXTINF:9.78,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719932.ts
#EXTINF:9.31,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719933.ts
#EXTINF:9.98,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719934.ts
#EXTINF:9.25,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719935.ts`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://dummy.url.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments).to.have.lengthOf(10);
    expect(result.totalduration).to.equal(84.94);
    expect(result.targetduration).to.equal(10);
    expect(result.fragments[0].url).to.equal(
      'http://dummy.url.com/hls/live/segment/segment_022916_164500865_719926.ts',
    );
    expect(result.fragments[0].tagList).to.have.lengthOf(1);
    expect(result.fragments[2].tagList[0][0]).to.equal('EXT-X-CUE-OUT');
    expect(result.fragments[2].tagList[0][1]).to.equal(
      'DURATION=150,BREAKID=0x0',
    );
    expect(result.fragments[3].tagList[0][1]).to.equal('0.50');
    expect(result.fragments[4].tagList).to.have.lengthOf(2);
    expect(result.fragments[4].tagList[0][0]).to.equal('EXT-X-CUE-IN');
    expect(result.fragments[7].tagList[0][0]).to.equal('INF');
    expect(result.fragments[8].url).to.equal(
      'http://dummy.url.com/hls/live/segment/segment_022916_164500865_719934.ts',
    );
  });

  it('parses playlists with #EXT-X-PROGRAM-DATE-TIME after #EXTINF before fragment URL', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:2
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:69844067
#EXTINF:10, no desc
#EXT-X-PROGRAM-DATE-TIME:2016-05-27T16:34:44Z
Rollover38803/20160525T064049-01-69844067.ts
#EXTINF:10, no desc
#EXT-X-PROGRAM-DATE-TIME:2016-05-27T16:34:54Z
Rollover38803/20160525T064049-01-69844068.ts
#EXTINF:10, no desc
#EXT-X-PROGRAM-DATE-TIME:2016-05-27T16:35:04Z
Rollover38803/20160525T064049-01-69844069.ts
    `;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://video.example.com/disc.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments).to.have.lengthOf(3);
    expect(result.hasProgramDateTime).to.be.true;
    expect(result.totalduration).to.equal(30);
    expect(result.fragments[0].url).to.equal(
      'http://video.example.com/Rollover38803/20160525T064049-01-69844067.ts',
    );
    expect(result.fragments[0].programDateTime).to.equal(1464366884000);
    expect(result.fragments[1].url).to.equal(
      'http://video.example.com/Rollover38803/20160525T064049-01-69844068.ts',
    );
    expect(result.fragments[1].programDateTime).to.equal(1464366894000);
    expect(result.fragments[2].url).to.equal(
      'http://video.example.com/Rollover38803/20160525T064049-01-69844069.ts',
    );
    expect(result.fragments[2].programDateTime).to.equal(1464366904000);
  });

  it('parses #EXTINF without a leading digit', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-TARGETDURATION:14
#EXTINF:.360,
/sec(3ae40f708f79ca9471f52b86da76a3a8)/frag(1)/video/107/282/158282701_mp4_h264_aac_hq.ts
#EXT-X-ENDLIST`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments).to.have.lengthOf(1);
    expect(result.fragments[0].duration).to.equal(0.36);
  });

  it('parses #EXT-X-MAP URI', function () {
    const level = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-VERSION:7
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MAP:URI="main.mp4",BYTERANGE="718@0"
#EXTINF:6.00600,
#EXT-X-BYTERANGE:1543597@718
main.mp4`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    const initSegment = result.fragments[0].initSegment;
    expect(initSegment?.url).to.equal(
      'http://proxy-62.dailymotion.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/main.mp4',
    );
    expect(initSegment?.byteRangeStartOffset).to.equal(0);
    expect(initSegment?.byteRangeEndOffset).to.equal(718);
    expect(initSegment?.sn).to.equal('initSegment');
  });

  it('parses multiple #EXT-X-MAP URI', function () {
    const level = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-VERSION:7
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MAP:URI="main.mp4"
#EXTINF:6.00600,
frag1.mp4
#EXT-X-DISCONTINUITY
#EXT-X-MAP:URI="alt.mp4"
#EXTINF:4.0
frag2.mp4
`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://video.example.com/disc.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments[0].initSegment?.url).to.equal(
      'http://video.example.com/main.mp4',
    );
    expect(result.fragments[0].initSegment?.sn).to.equal('initSegment');
    expect(result.fragments[1].initSegment?.url).to.equal(
      'http://video.example.com/alt.mp4',
    );
    expect(result.fragments[1].initSegment?.sn).to.equal('initSegment');
  });

  describe('PDT calculations', function () {
    it('if playlists contains #EXT-X-PROGRAM-DATE-TIME switching will be applied by PDT', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:2
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:69844067
#EXTINF:10, no desc
#EXT-X-PROGRAM-DATE-TIME:2016-05-27T16:34:44Z
Rollover38803/20160525T064049-01-69844067.ts
#EXTINF:10, no desc
#EXT-X-PROGRAM-DATE-TIME:2016-05-27T16:34:54Z
Rollover38803/20160525T064049-01-69844068.ts
#EXTINF:10, no desc
#EXT-X-PROGRAM-DATE-TIME:2016-05-27T16:35:04Z
Rollover38803/20160525T064049-01-69844069.ts
    `;
      const result = M3U8Parser.parseLevelPlaylist(
        level,
        'http://video.example.com/disc.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(result.playlistParsingError).to.be.null;
      expect(result.hasProgramDateTime).to.be.true;
      expect(result.fragments[0].rawProgramDateTime).to.equal(
        '2016-05-27T16:34:44Z',
      );
      expect(result.fragments[0].programDateTime).to.equal(1464366884000);
      expect(result.fragments[1].rawProgramDateTime).to.equal(
        '2016-05-27T16:34:54Z',
      );
      expect(result.fragments[1].programDateTime).to.equal(1464366894000);
      expect(result.fragments[2].rawProgramDateTime).to.equal(
        '2016-05-27T16:35:04Z',
      );
      expect(result.fragments[2].programDateTime).to.equal(1464366904000);
    });

    it('backfills PDT values if the first segment does not start with PDT', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:10
#EXTINF:10
frag0.ts
#EXTINF:10
frag1.ts
#EXTINF:10
#EXT-X-PROGRAM-DATE-TIME:2016-05-27T16:35:04Z
frag2.ts
    `;

      const result = M3U8Parser.parseLevelPlaylist(
        level,
        'http://video.example.com/disc.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(result.playlistParsingError).to.be.null;
      expect(result.hasProgramDateTime).to.be.true;
      expect(result.fragments[2].rawProgramDateTime).to.equal(
        '2016-05-27T16:35:04Z',
      );
      expect(result.fragments[1].programDateTime).to.equal(1464366894000);
      expect(result.fragments[0].programDateTime).to.equal(1464366884000);
    });

    it('extrapolates PDT forward when subsequent fragments do not have a raw programDateTime', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:10
#EXTINF:10
#EXT-X-PROGRAM-DATE-TIME:2016-05-27T16:35:04Z
frag0.ts
#EXTINF:10
frag1.ts
#EXTINF:10
frag2.ts
    `;

      const result = M3U8Parser.parseLevelPlaylist(
        level,
        'http://video.example.com/disc.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(result.playlistParsingError).to.be.null;
      expect(result.hasProgramDateTime).to.be.true;
      expect(result.fragments[0].rawProgramDateTime).to.equal(
        '2016-05-27T16:35:04Z',
      );
      expect(result.fragments[1].programDateTime).to.equal(1464366914000);
      expect(result.fragments[2].programDateTime).to.equal(1464366924000);
    });

    it('recomputes PDT extrapolation whenever a new raw programDateTime is hit', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:10
#EXT-X-DISCONTINUITY
#EXT-X-PROGRAM-DATE-TIME:2016-05-27T16:35:04Z
#EXTINF:10
frag0.ts
#EXTINF:10
frag1.ts
#EXT-X-DISCONTINUITY
#EXT-X-PROGRAM-DATE-TIME:2017-05-27T16:35:04Z
#EXTINF:10
frag2.ts
#EXTINF:10
frag3.ts
#EXT-X-DISCONTINUITY
#EXT-X-PROGRAM-DATE-TIME:2015-05-27T11:42:03Z
#EXTINF:10
frag4.ts
#EXTINF:10
frag5.ts
    `;

      const result = M3U8Parser.parseLevelPlaylist(
        level,
        'http://video.example.com/disc.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(result.playlistParsingError).to.be.null;
      expect(result.hasProgramDateTime).to.be.true;
      expect(result.fragments[0].programDateTime).to.equal(1464366904000);
      expect(result.fragments[0].rawProgramDateTime).to.equal(
        '2016-05-27T16:35:04Z',
      );
      expect(result.fragments[1].programDateTime).to.equal(1464366914000);
      expect(result.fragments[2].programDateTime).to.equal(1495902904000);
      expect(result.fragments[2].rawProgramDateTime).to.equal(
        '2017-05-27T16:35:04Z',
      );
      expect(result.fragments[3].programDateTime).to.equal(1495902914000);
      expect(result.fragments[4].programDateTime).to.equal(1432726923000);
      expect(result.fragments[4].rawProgramDateTime).to.equal(
        '2015-05-27T11:42:03Z',
      );
      expect(result.fragments[5].programDateTime).to.equal(1432726933000);
    });

    it('propagates the raw programDateTime to the fragment following the init segment', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:10
#EXTINF:10
#EXT-X-PROGRAM-DATE-TIME:2016-05-27T16:35:04Z
#EXT-X-MAP
frag0.ts
#EXTINF:10
frag1.ts
    `;
      const result = M3U8Parser.parseLevelPlaylist(
        level,
        'http://video.example.com/disc.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(result.playlistParsingError).to.be.null;
      expect(result.hasProgramDateTime).to.be.true;
      expect(result.fragments[0].rawProgramDateTime).to.equal(
        '2016-05-27T16:35:04Z',
      );
      expect(result.fragments[0].programDateTime).to.equal(1464366904000);
    });

    it('ignores bad PDT values', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:10
#EXTINF:10
#EXT-X-PROGRAM-DATE-TIME:foo
frag0.ts
#EXTINF:10
frag1.ts
    `;
      const result = M3U8Parser.parseLevelPlaylist(
        level,
        'http://video.example.com/disc.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(result.playlistParsingError).to.be.null;
      expect(result.hasProgramDateTime).to.be.false;
      expect(result.fragments[0].rawProgramDateTime).to.not.exist;
      expect(result.fragments[0].programDateTime).to.not.exist;
    });
  });

  describe('Low-Latency HLS Manifest Parsing', function () {
    const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:4
#EXT-X-VERSION:3
#EXT-X-PART-INF:PART-TARGET=1.004000
#EXT-X-MEDIA-SEQUENCE:1151226
#EXTINF:4.00000,
fileSequence1151226.ts
#EXT-X-PROGRAM-DATE-TIME:2020-08-11T23:02:18.003Z
#EXTINF:4.00000,
fileSequence1151227.ts
#EXTINF:4.00000,
fileSequence1151228.ts
#EXTINF:4.00000,
fileSequence1151229.ts
#EXTINF:4.00000,
fileSequence1151230.ts
#EXTINF:4.00000,
fileSequence1151231.ts
#EXT-X-PROGRAM-DATE-TIME:2020-08-11T23:02:38.003Z
#EXT-X-PART:DURATION=1.00000,INDEPENDENT=YES,URI="lowLatencyHLS.php?segment=filePart1151232.1.ts"
#EXT-X-PART:DURATION=1.00001,INDEPENDENT=NO,URI="lowLatencyHLS.php?segment=filePart1151232.2.ts"
#EXT-X-PART:DURATION=1.00000,INDEPENDENT=YES,URI="lowLatencyHLS.php?segment=filePart1151232.3.ts"
#EXT-X-PART:DURATION=1.00000,INDEPENDENT=YES,URI="lowLatencyHLS.php?segment=filePart1151232.4.ts"
#EXTINF:4.00000,
fileSequence1151232.ts
#EXT-X-PART:DURATION=1.00000,INDEPENDENT=YES,URI="lowLatencyHLS.php?segment=filePart1151233.1.ts"
#EXT-X-PART:DURATION=0.99999,INDEPENDENT=YES,URI="lowLatencyHLS.php?segment=filePart1151233.2.ts"
#EXT-X-PART:DURATION=1.00000,URI="lowLatencyHLS.php?segment=filePart1151233.3.ts"
#EXT-X-PART:DURATION=1.00000,GAP=YES,INDEPENDENT=YES,URI="lowLatencyHLS.php?segment=filePart1151233.4.ts"
#EXTINF:4.00000,
fileSequence1151233.ts
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="lowLatencyHLS.php?segment=filePart1151234.1.ts"
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=24,PART-HOLD-BACK=3.012
#EXT-X-RENDITION-REPORT:URI="/media0/lowLatencyHLS.php",LAST-MSN=1151201,LAST-PART=3
#EXT-X-RENDITION-REPORT:URI="/media2/lowLatencyHLS.php",LAST-MSN=1151201,LAST-PART=3`;

    it('Parses EXT-X-SERVER-CONTROL', function () {
      const details = M3U8Parser.parseLevelPlaylist(
        playlist,
        'http://dummy.url.com/playlist.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.playlistParsingError).to.be.null;
      expect(details.canBlockReload).to.be.true;
      expect(details.canSkipUntil).to.equal(24);
      expect(details.partHoldBack).to.equal(3.012);
      // defaults:
      expect(details.holdBack).to.equal(0);
      expect(details.canSkipDateRanges).to.be.false;
    });

    it('Parses EXT-X-SERVER-CONTROL CAN-SKIP-DATERANGES and HOLD-BACK attributes', function () {
      const details = M3U8Parser.parseLevelPlaylist(
        `#EXTM3U
#EXT-X-TARGETDURATION:4
#EXT-X-VERSION:3
#EXT-X-SERVER-CONTROL:CAN-SKIP-UNTIL=20,CAN-SKIP-DATERANGES=YES,HOLD-BACK=15.1
#EXTINF:4.00000,
fileSequence1151226.ts`,
        'http://dummy.url.com/playlist.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.playlistParsingError).to.be.null;
      expect(details.canSkipUntil).to.equal(20);
      expect(details.holdBack).to.equal(15.1);
      expect(details.canSkipDateRanges).to.be.true;
      // defaults:
      expect(details.canBlockReload).to.be.false;
      expect(details.partHoldBack).to.equal(0);
      expect(details.partTarget).to.equal(0);
    });

    it('Parses EXT-X-PART-INF', function () {
      const details = M3U8Parser.parseLevelPlaylist(
        playlist,
        'http://dummy.url.com/playlist.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.partTarget).to.equal(1.004);
    });

    it('Parses EXT-X-PART', function () {
      const details = M3U8Parser.parseLevelPlaylist(
        playlist,
        'http://dummy.url.com/playlist.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.playlistParsingError).to.be.null;
      // TODO: Partial Segments for a yet to be appended EXT-INF entry will be added to the fragments list
      //  once PartLoader is implemented to abstract away part loading complexity using progressive loader events
      expect(details.fragments).to.have.lengthOf(8);
      const partList = details.partList as Part[];
      expect(partList).to.be.an('array').which.has.lengthOf(8);
      expect(partList[0].fragment).to.equal(details.fragments[6]);
      expect(partList[1].fragment).to.equal(details.fragments[6]);
      expect(partList[2].fragment).to.equal(details.fragments[6]);
      expect(partList[3].fragment).to.equal(details.fragments[6]);
      expect(partList[4].fragment).to.equal(details.fragments[7]);
      expect(partList[5].fragment).to.equal(details.fragments[7]);
      expect(partList[6].fragment).to.equal(details.fragments[7]);
      expect(partList[7].fragment).to.equal(details.fragments[7]);
      expectWithJSONMessage(partList[0], '6-0').to.deep.include({
        duration: 1,
        gap: false,
        independent: true,
        index: 0,
        relurl: 'lowLatencyHLS.php?segment=filePart1151232.1.ts',
      });
      expectWithJSONMessage(partList[1], '6-1').to.deep.include({
        duration: 1.00001,
        gap: false,
        independent: false,
        index: 1,
        relurl: 'lowLatencyHLS.php?segment=filePart1151232.2.ts',
      });
      expectWithJSONMessage(partList[2], '6-2').to.deep.include({
        duration: 1,
        gap: false,
        independent: true,
        index: 2,
        relurl: 'lowLatencyHLS.php?segment=filePart1151232.3.ts',
      });
      expectWithJSONMessage(partList[3], '6-3').to.deep.include({
        duration: 1,
        gap: false,
        independent: true,
        index: 3,
        relurl: 'lowLatencyHLS.php?segment=filePart1151232.4.ts',
      });
      expectWithJSONMessage(partList[4], '7-0').to.deep.include({
        duration: 1,
        gap: false,
        independent: true,
        index: 0,
        relurl: 'lowLatencyHLS.php?segment=filePart1151233.1.ts',
      });
      expectWithJSONMessage(partList[5], '7-1').to.deep.include({
        duration: 0.99999,
        gap: false,
        independent: true,
        index: 1,
        relurl: 'lowLatencyHLS.php?segment=filePart1151233.2.ts',
      });
      expectWithJSONMessage(partList[6], '7-2').to.deep.include({
        duration: 1,
        gap: false,
        independent: false,
        index: 2,
        relurl: 'lowLatencyHLS.php?segment=filePart1151233.3.ts',
      });
      expectWithJSONMessage(partList[7], '7-3').to.deep.include({
        duration: 1,
        gap: true,
        independent: true,
        index: 3,
        relurl: 'lowLatencyHLS.php?segment=filePart1151233.4.ts',
      });
    });

    it('Parses EXT-X-PRELOAD-HINT', function () {
      const details = M3U8Parser.parseLevelPlaylist(
        playlist,
        'http://dummy.url.com/playlist.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.playlistParsingError).to.be.null;
      expect(details.preloadHint).to.be.an('object');
      expect(details.preloadHint).to.deep.include({
        TYPE: 'PART',
        URI: 'lowLatencyHLS.php?segment=filePart1151234.1.ts',
      });
    });

    it('Parses EXT-X-RENDITION-REPORT', function () {
      const details = M3U8Parser.parseLevelPlaylist(
        playlist,
        'http://dummy.url.com/playlist.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.playlistParsingError).to.be.null;
      const renditionReports = details.renditionReports as AttrList[];
      expect(renditionReports).to.be.an('array').which.has.lengthOf(2);
      expect(renditionReports[0]).to.deep.include({
        URI: '/media0/lowLatencyHLS.php',
        'LAST-MSN': '1151201',
        'LAST-PART': '3',
      });
    });

    it('Parses EXT-X-SKIP delta playlists', function () {
      const details = M3U8Parser.parseLevelPlaylist(
        `#EXTM3U
#EXT-X-TARGETDURATION:4
#EXT-X-VERSION:9
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=24,PART-HOLD-BACK=3.012
#EXT-X-PART-INF:PART-TARGET=1.004000
#EXT-X-MEDIA-SEQUENCE:81541
#EXT-X-SKIP:SKIPPED-SEGMENTS=9,RECENTLY-REMOVED-DATERANGES="DrTag	tdl"
#EXTINF:3.98933,
fileSequence81635.m4s
#EXTINF:3.98933,
fileSequence81636.m4s
#EXTINF:3.98933,
fileSequence81637.m4s
#EXT-X-PROGRAM-DATE-TIME:2023-01-15T02:28:01.425Z
#EXTINF:3.98933,
fileSequence81638.m4s
#EXTINF:3.98933,
fileSequence81639.m4s
#EXT-X-PART:DURATION=1.00267,URI="lowLatencySeg.m4s?segment=filePart81640.1.m4s"
#EXT-X-PART:DURATION=1.00267,URI="lowLatencySeg.m4s?segment=filePart81640.2.m4s"
#EXT-X-PART:DURATION=1.00267,URI="lowLatencySeg.m4s?segment=filePart81640.3.m4s"
#EXT-X-PART:DURATION=0.98133,URI="lowLatencySeg.m4s?segment=filePart81640.4.m4s"
#EXTINF:3.98933,
fileSequence81640.m4s
#EXT-X-PART:DURATION=1.00267,URI="lowLatencySeg.m4s?segment=filePart81641.1.m4s"
#EXT-X-PART:DURATION=1.00267,URI="lowLatencySeg.m4s?segment=filePart81641.2.m4s"
#EXT-X-PART:DURATION=1.00267,URI="lowLatencySeg.m4s?segment=filePart81641.3.m4s"
#EXT-X-PART:DURATION=0.98133,URI="lowLatencySeg.m4s?segment=filePart81641.4.m4s"
#EXTINF:3.98933,
fileSequence81641.m4s
#EXT-X-PART:DURATION=1.00267,URI="lowLatencySeg.m4s?segment=filePart81642.1.m4s"
#EXT-X-PART:DURATION=1.00267,URI="lowLatencySeg.m4s?segment=filePart81642.2.m4s"
#EXT-X-PART:DURATION=1.00267,URI="lowLatencySeg.m4s?segment=filePart81642.3.m4s"
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="lowLatencySeg.m4s?segment=filePart81642.4.m4s"
#`,
        'http://dummy.url.com/playlist.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.playlistParsingError).to.be.null;
      expect(details.skippedSegments).to.equal(9);
      expect(details.recentlyRemovedDateranges).to.deep.equal(['DrTag', 'tdl']);
      expect(details.fragments[0]).to.be.null;
      expect(details.fragments[8]).to.be.null;
      expect(details.fragments[9]).to.deep.include({
        relurl: 'fileSequence81635.m4s',
      });
      expect(details.fragments).to.have.lengthOf(16);
      expect(details.partList).to.be.an('array').which.has.lengthOf(11);
      expect(details.preloadHint).to.deep.include({
        TYPE: 'PART',
        URI: 'lowLatencySeg.m4s?segment=filePart81642.4.m4s',
      });
    });
  });

  it('adds BITRATE to fragment.tagList', function () {
    const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:5.97263,\t
#EXT-X-BITRATE:5083
fileSequence0.ts
#EXTINF:5.97263,\t
#EXT-X-BITRATE:5453
fileSequence1.ts
#EXTINF:5.97263,\t
#EXT-X-BITRATE:4802
fileSequence2.ts
`;
    const details = M3U8Parser.parseLevelPlaylist(
      playlist,
      'http://dummy.url.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(details.playlistParsingError).to.be.null;
    const fragments = details.fragments as Fragment[];
    expect(fragments[0].bitrate).to.equal(5083000);
    expectWithJSONMessage(fragments[0].tagList).to.deep.equal([
      ['INF', '5.97263', '\t'],
      ['BITRATE', '5083'],
    ]);

    expect(fragments[1].bitrate).to.equal(5453000);
    expectWithJSONMessage(fragments[1].tagList).to.deep.equal([
      ['INF', '5.97263', '\t'],
      ['BITRATE', '5453'],
    ]);

    expect(fragments[2].bitrate).to.equal(4802000);
    expectWithJSONMessage(fragments[2].tagList).to.deep.equal([
      ['INF', '5.97263', '\t'],
      ['BITRATE', '4802'],
    ]);
  });

  it('parses segment tags used to get bitrate and byte length from fragments', function () {
    const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:5
#EXT-X-BITRATE:1000
fileSequence0.ts
#EXTINF:5
#EXT-X-BYTERANGE:600000@123456
fileSequence1.ts
#EXTINF: 5
fileSequence2.ts
`;
    const details = M3U8Parser.parseLevelPlaylist(
      playlist,
      'http://dummy.url.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(details.playlistParsingError).to.be.null;
    const fragments = details.fragments as Fragment[];
    expect(fragments[0].byteLength).to.equal(null);
    expect(fragments[0].bitrate).to.equal(1000000);
    expect(fragments[1].byteLength).to.equal(600000);
    expect(fragments[1].bitrate).to.equal(960000);
    expect(fragments[2].byteLength).to.equal(null);
    expect(fragments[2].bitrate).to.equal(
      1000000,
      '#EXT-X-BITRATE applies to every segment between it and the next bitrate tag',
    );

    // Stat data overrides byteLength and bitrate data
    fragments[2].stats = new LoadStats();
    fragments[2].stats.total = 12000;
    expect(fragments[2].byteLength).to.equal(12000);
    expect(fragments[2].bitrate).to.equal(19200);

    fragments[1].stats = new LoadStats();
    fragments[1].stats.total = 8000000;
    expect(fragments[1].byteLength).to.equal(8000000);
    expect(fragments[1].bitrate).to.equal(12800000);

    fragments[0].stats = new LoadStats();
    fragments[0].stats.total = 5000000;
    expect(fragments[0].byteLength).to.equal(5000000);
    expect(fragments[0].bitrate).to.equal(8000000);
  });

  it('adds GAP to fragment.tagList and sets fragment.gap', function () {
    const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:5
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:5,title
fileSequence0.ts
#EXTINF:5,
#EXT-X-GAP
fileSequence1.ts
#EXTINF:5,
fileSequence2.ts
`;
    const details = M3U8Parser.parseLevelPlaylist(
      playlist,
      'http://dummy.url.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(details.playlistParsingError).to.be.null;
    const fragments = details.fragments as Fragment[];
    expectWithJSONMessage(fragments[0].tagList).to.deep.equal([
      ['INF', '5', 'title'],
    ]);
    expectWithJSONMessage(fragments[1].tagList).to.deep.equal([
      ['INF', '5'],
      ['GAP'],
    ]);
    expectWithJSONMessage(fragments[2].tagList).to.deep.equal([['INF', '5']]);
    expect(fragments[0].gap).to.equal(undefined);
    expect(fragments[1].gap).to.equal(true);
    expect(fragments[2].gap).to.equal(undefined);
  });

  describe('#EXT-X-DATERANGE', function () {
    it('parses DATERANGE tags including Interstitials', function () {
      const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:6
#EXT-X-VERSION:10
#EXT-X-DISCONTINUITY-SEQUENCE:1
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-TIMESTAMP:1705081564
#EXT-X-PROGRAM-DATE-TIME:2024-01-12T10:00:00.000Z
#EXT-X-DATERANGE:ID="pre",CLASS="com.apple.hls.interstitial",CUE="PRE",START-DATE="2024-01-12T08:00:00.000Z",DURATION=15.0,X-ASSET-URI="b.m3u8?_HLS_interstitial_id=pre",X-RESTRICT="SKIP,JUMP",X-SNAP="IN"
#EXT-X-MAP:URI="init_0.mp4"
#EXTINF:6,
segment.m4s
#EXTINF:6,
segment.m4s
#EXT-X-DATERANGE:ID="mid1",CLASS="com.apple.hls.interstitial",CUE="ONCE",START-DATE="2024-01-12T10:00:10.000Z",DURATION=15.0,X-ASSET-URI="b.m3u8?_HLS_interstitial_id=mid1",X-RESTRICT="SKIP,JUMP"
#EXTINF:4,
segment.m4s
#EXT-X-DISCONTINUITY
#EXT-X-PROGRAM-DATE-TIME:2024-01-12T10:00:16.000Z
#EXT-X-MAP:URI="init_1.mp4"
#EXTINF:6,
segment.m4s
#EXTINF:4,
segment.m4s
#EXT-X-DATERANGE:ID="mid2",CLASS="com.apple.hls.interstitial",START-DATE="2024-01-12T10:00:25.000Z",DURATION=15.0,X-ASSET-URI="b.m3u8?_HLS_interstitial_id=mid2",X-SNAP="OUT,IN"
#EXT-X-DISCONTINUITY
#EXT-X-PROGRAM-DATE-TIME:2024-01-12T10:00:26.000Z
#EXT-X-MAP:URI="init_2.mp4"
#EXTINF:6,
segment.m4s
#EXTINF:6,
segment.m4s

#EXT-X-DATERANGE:ID="post",CLASS="com.apple.hls.interstitial",CUE="POST,ONCE",START-DATE="2024-01-12T10:00:00.000Z",DURATION=15.0,X-ASSET-URI="e.m3u8?_HLS_interstitial_id=post"`;
      const details = M3U8Parser.parseLevelPlaylist(
        playlist,
        'http://dummy.url.com/playlist.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.playlistParsingError).to.be.null;
      expect(details.dateRangeTagCount).to.equal(4);
      expect(details.dateRanges.pre.isInterstitial).to.be.true;
      expect(details.dateRanges.mid1.isInterstitial).to.be.true;
      expect(details.dateRanges.mid2.isInterstitial).to.be.true;
      expect(details.dateRanges.post.isInterstitial).to.be.true;
      expect(details.dateRanges).to.have.property('pre').which.deep.includes({
        tagOrder: 0,
      });
      expect(details.dateRanges).to.have.property('mid1').which.deep.includes({
        tagOrder: 1,
      });
      expect(details.dateRanges).to.have.property('mid2').which.deep.includes({
        tagOrder: 2,
      });
      expect(details.dateRanges).to.have.property('post').which.deep.includes({
        tagOrder: 3,
      });
      expect(details.dateRanges.pre.cue.pre).to.be.true;
      expect(details.dateRanges.mid1.cue.once).to.be.true;
      expect(details.dateRanges.post.cue.post).to.be.true;
      expect(details.dateRanges.post.cue.once).to.be.true;
      // DateRange start times are mapped to the primary timeline and not changed by CUE Interstitial DURATION
      expect(details.dateRanges.pre.startTime).to.equal(-7200);
      expect(details.dateRanges.mid1.startTime).to.equal(10);
      expect(details.dateRanges.mid2.startTime).to.equal(25);
      expect(details.dateRanges.post.startTime).to.equal(0);
    });

    it('ensures DateRanges are mapped to a segment whose TimeRange covers the start date of the DATERANGE tag', function () {
      const playlist = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-PROGRAM-DATE-TIME:1970-01-01T00:00:00.000Z
#EXT-X-DATERANGE:ID="sooner",START-DATE="1970-01-01T00:00:20.000Z"
#EXTINF:10
1.mp4
#EXT-X-DISCONTINUITY
#EXT-X-PROGRAM-DATE-TIME:1970-01-01T00:00:20.000Z
#EXTINF:10
2.mp4
#EXTINF:10
3.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        playlist,
        'http://dummy.url.com/playlist.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.playlistParsingError).to.be.null;
      expect(details.dateRanges.sooner.isValid).to.equal(
        true,
        'is valid DateRange',
      );
      expect(details.dateRanges.sooner.tagAnchor)
        .to.have.property('sn')
        .which.equals(2);
      expect(details.dateRanges.sooner.startTime).to.equal(10);
    });

    it('ensures DateRanges that start before the program are mapped to the first PDT tag', function () {
      const playlist = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-PROGRAM-DATE-TIME:2000-01-01T00:00:00.000Z
#EXT-X-DATERANGE:ID="earlier",START-DATE="1999-12-31T23:59:50.000Z"
#EXTINF:10
1.mp4
#EXT-X-DISCONTINUITY
#EXT-X-PROGRAM-DATE-TIME:2000-01-01T00:00:20.000Z
#EXTINF:10
2.mp4
#EXTINF:10
3.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        playlist,
        'http://dummy.url.com/playlist.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.playlistParsingError).to.be.null;
      expect(details.dateRanges.earlier.isValid).to.equal(
        true,
        'is valid DateRange',
      );
      expect(details.dateRanges.earlier.tagAnchor)
        .to.have.property('sn')
        .which.equals(1);
      expect(details.dateRanges.earlier.startTime).to.equal(-10);
    });

    it('adds PROGRAM-DATE-TIME and DATERANGE tag text to fragment[].tagList for backwards compatibility', function () {
      const playlist = `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-VERSION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-PROGRAM-DATE-TIME:2018-09-28T16:50:26Z
#EXTINF:10,
main1.aac
#EXT-X-PROGRAM-DATE-TIME:2018-09-28T16:50:36Z
#EXT-X-DATERANGE:ID="splice-6FFFFFF0",START-DATE="2018-09-28T16:50:48Z",PLANNED-DURATION=20.0,X-CUSTOM="Hi!",SCTE35-OUT=0xFC002F0000000000FF
#EXTINF:10,
main2.aac
#EXTINF:10,
main3.aac
#EXT-X-PROGRAM-DATE-TIME:2018-09-28T16:50:56Z
#EXT-X-DATERANGE:ID="splice-6FFFFFF0",START-DATE="2018-09-28T16:51:18Z",DURATION=30.0,SCTE35-IN=0xFC002F0000000000FF
#EXTINF:9.9846,
main4.aac
  `;
      const details = M3U8Parser.parseLevelPlaylist(
        playlist,
        'http://dummy.url.com/playlist.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.playlistParsingError).to.be.null;
      expectWithJSONMessage(details.fragments[0].tagList).to.deep.equal([
        ['PROGRAM-DATE-TIME', '2018-09-28T16:50:26Z'],
        ['INF', '10'],
      ]);
      expectWithJSONMessage(details.fragments[1].tagList).to.deep.equal([
        ['PROGRAM-DATE-TIME', '2018-09-28T16:50:36Z'],
        [
          'EXT-X-DATERANGE',
          'ID="splice-6FFFFFF0",START-DATE="2018-09-28T16:50:48Z",PLANNED-DURATION=20.0,X-CUSTOM="Hi!",SCTE35-OUT=0xFC002F0000000000FF',
        ],
        ['INF', '10'],
      ]);
      expectWithJSONMessage(details.fragments[2].tagList).to.deep.equal([
        ['INF', '10'],
      ]);
      expectWithJSONMessage(details.fragments[3].tagList).to.deep.equal([
        ['PROGRAM-DATE-TIME', '2018-09-28T16:50:56Z'],
        [
          'EXT-X-DATERANGE',
          'ID="splice-6FFFFFF0",START-DATE="2018-09-28T16:51:18Z",DURATION=30.0,SCTE35-IN=0xFC002F0000000000FF',
        ],
        ['INF', '9.9846'],
      ]);
    });
  });

  it('tests : at end of tag name is used to divide custom tags', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:2
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:69844067
#EXTINF:9.40,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719926.ts
#EXTINF:9.56,
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719927.ts
#EXT-X-CUSTOM-DATE:2016-05-27T16:34:44Z
#EXT-X-CUSTOM-JSON:{"key":"value"}
#EXT-X-CUSTOM-URI:http://dummy.url.com/hls/moreinfo.json
#EXTINF:10, no desc
http://dummy.url.com/hls/live/segment/segment_022916_164500865_719928.ts
    `;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://dummy.url.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments[2].tagList[0][0]).to.equal('EXT-X-CUSTOM-DATE');
    expect(result.fragments[2].tagList[0][1]).to.equal('2016-05-27T16:34:44Z');
    expect(result.fragments[2].tagList[1][0]).to.equal('EXT-X-CUSTOM-JSON');
    expect(result.fragments[2].tagList[1][1]).to.equal('{"key":"value"}');
    expect(result.fragments[2].tagList[2][0]).to.equal('EXT-X-CUSTOM-URI');
    expect(result.fragments[2].tagList[2][1]).to.equal(
      'http://dummy.url.com/hls/moreinfo.json',
    );
  });

  it('allows spaces in the fragment files', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:7
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:6.006,
180724_Allison VLOG-v3_00001.ts
#EXTINF:6.006,
180724_Allison VLOG-v3_00002.ts
#EXT-X-ENDLIST
    `;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://dummy.url.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments.length).to.equal(2);
    expect(result.totalduration).to.equal(12.012);
    expect(result.targetduration).to.equal(7);
    expect(result.fragments[0].url).to.equal(
      'http://dummy.url.com/180724_Allison VLOG-v3_00001.ts',
    );
    expect(result.fragments[1].url).to.equal(
      'http://dummy.url.com/180724_Allison VLOG-v3_00002.ts',
    );
  });

  it('deals with spaces after fragment files', function () {
    // You can't see them, but there should be spaces directly after the .ts
    const level = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:7
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:6.006,
180724_Allison VLOG v3_00001.ts
#EXTINF:6.006,
180724_Allison VLOG v3_00002.ts
#EXT-X-ENDLIST
    `;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://dummy.url.com/playlist.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments.length).to.equal(2);
    expect(result.totalduration).to.equal(12.012);
    expect(result.targetduration).to.equal(7);
    expect(result.fragments[0].url).to.equal(
      'http://dummy.url.com/180724_Allison VLOG v3_00001.ts',
    );
    expect(result.fragments[1].url).to.equal(
      'http://dummy.url.com/180724_Allison VLOG v3_00002.ts',
    );
  });

  it('parse fmp4 level with discontinuities and program date time', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:6
#EXT-X-MEDIA-SEQUENCE:1638262
#EXT-X-DISCONTINUITY-SEQUENCE:28141

#EXT-X-KEY:METHOD=NONE
#EXTINF:5.005,
#EXT-X-MAP:URI="init.mp4"
#EXT-X-PROGRAM-DATE-TIME:2021-11-10T03:25:49.015Z
3.mp4
#EXTINF:5.005,
4.mp4
#EXTINF:1.961,
5.mp4
#EXT-X-DISCONTINUITY
#EXTINF:5.005,
0.mp4
#EXTINF:5.005,
1.mp4
#EXTINF:5.005,
2.mp4
#EXTINF:5.005,
3.mp4
#EXTINF:5.005,
4.mp4
#EXTINF:1.961,
5.mp4
#EXT-X-DISCONTINUITY
#EXTINF:5.005,
0.mp4
#EXTINF:5.005,
1.mp4
#EXTINF:5.005,
2.mp4
#EXTINF:5.005,
3.mp4
#EXTINF:5.005,
4.mp4
#EXTINF:1.961,
5.mp4
#EXT-X-DISCONTINUITY
#EXTINF:5.005,
0.mp4
#EXTINF:4.037,
1.mp4
#EXT-X-PROGRAM-DATE-TIME:2021-11-10T03:27:04Z
#EXT-X-CUE-IN
#EXT-X-MAP:URI="init_960719739.mp4"
#EXT-X-DISCONTINUITY
#EXTINF:6.0,
media_1638274.m4s
#EXTINF:6.0,
media_1638275.m4s
#EXTINF:6.0,
media_1638276.m4s
#EXTINF:6.0,
media_1638277.m4s
#EXTINF:6.0,
media_1638278.m4s`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://foo.com/adaptive/test.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments.length).to.equal(22);
    let pdt = 1636514824000;
    for (let i = 17; i < result.fragments.length; i++) {
      const frag = result.fragments[i];
      expect(frag.programDateTime).to.equal(pdt);
      pdt += frag.duration * 1000;
    }
  });

  it('parse clear->enc->clear->enc playlist', function () {
    const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:6

#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.5,
1.mp4
#EXTINF:5.0,
2.mp4

#EXT-X-DISCONTINUITY
#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://a",KEYFORMAT="com.apple.streamingkeydelivery",KEYFORMATVERSIONS="1"
#EXT-X-KEY:METHOD=SAMPLE-AES,URI="data:text/plain;base64,YQo=",KEYFORMAT="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",KEYFORMATVERSIONS="1"
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.5,
3.mp4
#EXTINF:5.0,
4.mp4

#EXT-X-DISCONTINUITY
#EXT-X-KEY:METHOD=NONE
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.5,
5.mp4
#EXTINF:5.0,
6.mp4

#EXT-X-DISCONTINUITY
#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://b",KEYFORMAT="com.apple.streamingkeydelivery",KEYFORMATVERSIONS="1"
#EXT-X-KEY:METHOD=SAMPLE-AES,URI="data:text/plain;base64,Yg==",KEYFORMAT="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",KEYFORMATVERSIONS="1"
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.0,
7.mp4
#EXTINF:4.0,
8.mp4
#EXT-X-ENDLIST`;
    const result = M3U8Parser.parseLevelPlaylist(
      level,
      'http://foo.com/adaptive/test.m3u8',
      0,
      PlaylistLevelType.MAIN,
      0,
      null,
    );
    expect(result.playlistParsingError).to.be.null;
    expect(result.fragments.length).to.equal(8);
    expect(result.fragments[0].levelkeys, 'first segment has no keys').to.equal(
      undefined,
    );
    expect(
      result.fragments[1].levelkeys,
      'second segment has no keys',
    ).to.equal(undefined);
    expect(result.fragments[2].levelkeys, 'third segment has two keys')
      .to.be.an('object')
      .with.keys([
        'com.apple.streamingkeydelivery',
        'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
      ]);
    expect(result.fragments[3].levelkeys, 'forth segment has two keys')
      .to.be.an('object')
      .with.keys([
        'com.apple.streamingkeydelivery',
        'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
      ]);
    expect(result.fragments[4].levelkeys, 'fifth segment has no keys').to.equal(
      undefined,
    );
    expect(result.fragments[5].levelkeys, 'sixth segment has no keys').to.equal(
      undefined,
    );
    expect(result.fragments[6].levelkeys, 'seventh segment has two keys')
      .to.be.an('object')
      .with.keys([
        'com.apple.streamingkeydelivery',
        'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
      ]);
    expect(result.fragments[7].levelkeys, 'eighth segment has two keys')
      .to.be.an('object')
      .with.keys([
        'com.apple.streamingkeydelivery',
        'urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
      ]);
    expect(result)
      .to.have.property('encryptedFragments')
      .which.is.an('array')
      .which.has.members([result.fragments[2], result.fragments[6]]);
  });

  it('parses manifest with EXT-X-SESSION-KEYs', function () {
    const manifest = `#EXTM3U
#EXT-X-SESSION-DATA:DATA-ID="key",VALUE="value"

#EXT-X-SESSION-KEY:METHOD=SAMPLE-AES,URI="skd://a",KEYFORMAT="com.apple.streamingkeydelivery",KEYFORMATVERSIONS="1"

#EXT-X-SESSION-KEY:METHOD=SAMPLE-AES,URI="data:text/plain;base64,YQo=",KEYFORMAT="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",KEYFORMATVERSIONS="1"

#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.x.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core

#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-21.x.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

    const result = M3U8Parser.parseMasterPlaylist(manifest, 'http://www.x.com');
    expect(result.sessionData).to.deep.equal({
      key: new AttrList({
        'DATA-ID': 'key',
        VALUE: 'value',
      }),
    });
    expect(result.sessionKeys)
      .to.be.an('array')
      .with.property('length')
      .which.equals(2);
    // enforce type
    if (result.sessionKeys === null) {
      expect(result.sessionKeys).to.not.be.null;
      return;
    }
    expect(result.sessionKeys[0])
      .to.have.property('uri')
      .which.equals('skd://a');
    expect(result.sessionKeys[0])
      .to.have.property('method')
      .which.equals('SAMPLE-AES');
    expect(result.sessionKeys[0])
      .to.have.property('keyFormat')
      .which.equals('com.apple.streamingkeydelivery');
    expect(result.sessionKeys[1])
      .to.have.property('uri')
      .which.equals('data:text/plain;base64,YQo=');
    expect(result.sessionKeys[1])
      .to.have.property('method')
      .which.equals('SAMPLE-AES');
    expect(result.sessionKeys[1])
      .to.have.property('keyFormat')
      .which.equals('urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed');
    expect(result.levels.length).to.equal(2);
  });

  describe('#EXT-X-START', function () {
    it('parses EXT-X-START in Multivariant Playlists', function () {
      const manifest = `#EXTM3U
#EXT-X-START:TIME-OFFSET=300.0,PRECISE=YES

#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.x.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

      const result = M3U8Parser.parseMasterPlaylist(
        manifest,
        'http://www.x.com',
      );
      expect(result.startTimeOffset).to.equal(300);
    });

    it('parses negative EXT-X-START values in Multivariant Playlists', function () {
      const manifest = `#EXTM3U
#EXT-X-START:TIME-OFFSET=-30.0
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.x.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

      const result = M3U8Parser.parseMasterPlaylist(
        manifest,
        'http://www.x.com',
      );
      expect(result.startTimeOffset).to.equal(-30);
    });

    it('result is null when EXT-X-START is not present', function () {
      const manifest = `#EXTM3U
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.x.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

      const result = M3U8Parser.parseMasterPlaylist(
        manifest,
        'http://www.x.com',
      );
      expect(result.startTimeOffset).to.equal(null);
    });
  });

  describe('#EXT-X-DEFINE', function () {
    it('parses EXT-X-DEFINE Variables in Multivariant Playlists', function () {
      const manifest = `#EXTM3U
#EXT-X-DEFINE:NAME="x",VALUE="1"
#EXT-X-DEFINE:NAME="y",VALUE="2"
#EXT-X-DEFINE:NAME="hello-var",VALUE="Hello there!"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.x.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

      const result = M3U8Parser.parseMasterPlaylist(
        manifest,
        'http://www.x.com',
      );
      if (result.variableList === null) {
        expect(result.variableList, 'variableList').to.not.equal(null);
        return;
      }
      expect(result.variableList.x).to.equal('1');
      expect(result.variableList.y).to.equal('2');
      expect(result.variableList['hello-var']).to.equal('Hello there!');
    });

    it('returns an error when duplicate Variables are found in Multivariant Playlists', function () {
      const manifest = `#EXTM3U
#EXT-X-DEFINE:NAME="foo",VALUE="ok"
#EXT-X-DEFINE:NAME="bar",VALUE="ok"
#EXT-X-DEFINE:NAME="foo",VALUE="duped"

#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=836280,CODECS="mp4a.40.2,avc1.64001f",RESOLUTION=848x360,NAME="480"
http://proxy-62.x.com/sec(3ae40f708f79ca9471f52b86da76a3a8)/video/107/282/158282701_mp4_h264_aac_hq.m3u8#cell=core`;

      const result = M3U8Parser.parseMasterPlaylist(
        manifest,
        'http://www.x.com',
      );
      if (result.variableList === null) {
        expect(result.variableList, 'variableList').to.not.equal(null);
        return;
      }
      expect(result.variableList.foo).to.equal('ok');
      expect(result.variableList.bar).to.equal('ok');
      expectPlaylistParsingError(
        result,
        'EXT-X-DEFINE duplicate Variable Name declarations: "foo"',
      );
    });

    it('substitutes variable references in quoted strings, URI lines, and hexidecimal attributes, following EXT-X-DEFINE tags in Multivariant Playlists', function () {
      const manifest = `#EXTM3U
#EXT-X-DEFINE:NAME="host",VALUE="example.com"
#EXT-X-DEFINE:NAME="foo",VALUE="ok"
#EXT-X-DEFINE:NAME="bar",VALUE="{$foo}"
#EXT-X-DEFINE:NAME="vcodec",VALUE="avc1.64001f"

#EXT-X-CONTENT-STEERING:SERVER-URI="https://{$host}/steering-manifest.json",PATHWAY-ID="{$foo}-CDN"

#EXT-X-DEFINE:NAME="session-var",VALUE="hmm"
#EXT-X-SESSION-DATA:DATA-ID="var-applied",VALUE="{$session-var}"

#EXT-X-DEFINE:NAME="p",VALUE="."
#EXT-X-DEFINE:NAME="v1",VALUE="1"
#EXT-X-DEFINE:NAME="two",VALUE="2"
#EXT-X-SESSION-KEY:METHOD=SAMPLE-AES,URI="skd://{$session-var}",KEYFORMAT="com.apple{$p}streamingkeydelivery",KEYFORMATVERSIONS="{$v1}/2",IV=0x0000000{$two}

#EXT-X-DEFINE:NAME="language",VALUE="eng"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="{$two}00k",LANGUAGE="{$language}",NAME="Audio",AUTOSELECT=YES,DEFAULT=YES,URI="https://{$host}/{$two}00k.m3u8",BANDWIDTH=614400

#EXT-X-STREAM-INF:BANDWIDTH=836280,CODECS="mp4a.40.2,{$vcodec}",RESOLUTION=848x360,AUDIO="{$two}00k",NAME="{$bar}1"
https://{$host}/sec/video/1.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1836280,CODECS="mp4a.40.2,{$vcodec}",RESOLUTION=848x360,NAME="{$bar}{$two}"
https://{$host}/sec/{$vcodec}/{$two}.m3u8`;

      const result = M3U8Parser.parseMasterPlaylist(
        manifest,
        'https://www.x.com',
      );

      if (result.variableList === null) {
        expect(result.variableList, 'variableList').to.not.equal(null);
        return;
      }
      expect(result.variableList.bar).to.equal('ok');

      if (result.sessionData === null) {
        expect(result.sessionData, 'sessionData').to.not.equal(null);
        return;
      }
      expect(result.sessionData['var-applied'].VALUE).to.equal('hmm');

      if (result.sessionKeys === null) {
        expect(result.sessionKeys).to.not.equal(null);
        return;
      }
      expect(result.sessionKeys[0].keyFormat).to.equal(
        'com.apple.streamingkeydelivery',
      );
      expect(result.sessionKeys[0].keyFormatVersions).to.deep.equal([1, 2]);
      expect(result.sessionKeys[0].iv).to.deep.equal(
        new Uint8Array([0, 0, 0, 2]),
      );

      expect(result.contentSteering).to.deep.include({
        uri: 'https://example.com/steering-manifest.json',
        pathwayId: 'ok-CDN',
      });

      expect(result.levels[0]).to.deep.include(
        {
          name: 'ok1',
          url: 'https://example.com/sec/video/1.m3u8',
          videoCodec: 'avc1.64001f',
        },
        JSON.stringify(result.levels[0], null, 2),
      );

      expect(result.levels[1]).to.deep.include(
        {
          name: 'ok2',
          url: 'https://example.com/sec/avc1.64001f/2.m3u8',
          videoCodec: 'avc1.64001f',
        },
        JSON.stringify(result.levels[0], null, 2),
      );

      const { AUDIO: audioTracks = [] } = M3U8Parser.parseMasterPlaylistMedia(
        manifest,
        'https://www.x.com',
        result,
      );

      expect(audioTracks[0]).to.deep.include(
        {
          groupId: '200k',
          lang: 'eng',
          url: 'https://example.com/200k.m3u8',
        },
        JSON.stringify(audioTracks[0], null, 2),
      );
    });

    it('imports and substitutes variable references in quoted strings, URI lines, and hexidecimal attributes, following EXT-X-DEFINE tags in Media Playlists', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:1
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-ALLOW-CACHE:NO
#EXT-X-TARGETDURATION:5
#EXT-X-DEFINE:IMPORT="mvpVariable"
#EXT-X-DEFINE:NAME="p",VALUE="part-"
#EXT-X-DEFINE:NAME="skd",VALUE="key-data"
#EXT-X-DEFINE:NAME="fps",VALUE="com.apple.streamingkeydelivery"
#EXT-X-DEFINE:NAME="init-bytes",VALUE="718@0"
#EXT-X-DEFINE:NAME="v1",VALUE="1"
#EXT-X-DEFINE:NAME="two",VALUE="2"
#EXT-X-DEFINE:NAME="metadata-id",VALUE="drMeta"
#EXT-X-DEFINE:NAME="date",VALUE="2018-09-28T16:50:48Z"
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,CAN-SKIP-UNTIL=24,PART-HOLD-BACK=3.012
#EXT-X-SKIP:SKIPPED-SEGMENTS=3,RECENTLY-REMOVED-DATERANGES="DrTag	tdl	{$metadata-id}	foo"
#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://{$skd}",KEYFORMAT="{$fps}",KEYFORMATVERSIONS="{$v1}/2",IV=0x0000000{$two}
#EXT-X-MAP:URI="{$mvpVariable}.mp4",BYTERANGE="{$init-bytes}"
#EXTINF:4,no desc {$mvpVariable}
a{$mvpVariable}.mp4
#EXTINF:4,no desc
2.mp4
#EXTINF:4,no desc
3.mp4
#EXT-X-PROGRAM-DATE-TIME:2018-09-28T16:50:36Z
#EXT-X-DATERANGE:ID="{$metadata-id}",START-DATE="{$date}",END-DATE="{$date}",X-CUSTOM="{$mvpVariable}!",SCTE35-OUT=0x{$two}0000000
#EXT-X-PART:DURATION=1.00000,INDEPENDENT=YES,URI="{$p}4-1.mp4",BYTERANGE="{$init-bytes}"
#EXT-X-PART:DURATION=0.99999,INDEPENDENT=YES,URI="{$p}4-2.mp4"
#EXT-X-PART:DURATION=1.00000,URI="{$p}4-3.mp4"
#EXT-X-PART:DURATION=1.00000,GAP=YES,INDEPENDENT=YES,URI="{$p}4-4.mp4"
#EXTINF:4.00000,
4.mp4
#EXT-X-PRELOAD-HINT:TYPE=PART,URI="{$p}5.1.mp4"
#EXT-X-RENDITION-REPORT:URI="/media0/{$mvpVariable}.m3u8",LAST-MSN=4,LAST-PART=3
#EXT-X-RENDITION-REPORT:URI="/media2/{$mvpVariable}.m3u8"`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        { mvpVariable: 'ok' },
      );
      expect(details.playlistParsingError).to.be.null;
      if (details.variableList === null) {
        expect(details.variableList, 'variableList').to.not.equal(null);
        return;
      }
      expect(details.variableList.mvpVariable).to.equal('ok');
      expect(details.variableList.p).to.equal('part-');
      expect(details.totalduration).to.equal(31);
      expect(details.startSN).to.equal(1);
      expect(details.targetduration).to.equal(5);
      expect(details.live).to.be.true;
      expect(details.skippedSegments).to.equal(3);
      expect(details.recentlyRemovedDateranges).to.deep.equal([
        'DrTag',
        'tdl',
        'drMeta',
        'foo',
      ]);
      expect(details.fragments).to.have.lengthOf(7);
      expect(details.fragments[3].title).to.equal(
        'no desc {$mvpVariable}',
        'does not substitute vars in segment "title"',
      );
      expect(details.fragments[3]).to.deep.include({
        relurl: 'aok.mp4',
        url: 'http://example.com/hls/aok.mp4',
      });
      expect(details.fragments[3].initSegment).to.deep.include({
        relurl: 'ok.mp4',
        url: 'http://example.com/hls/ok.mp4',
        byteRange: [0, 718],
      });
      if (details.partList === null) {
        expect(details.partList, 'partList').to.not.equal(null);
        return;
      }
      expect(details.partList[0]).to.deep.include({
        relurl: 'part-4-1.mp4',
        url: 'http://example.com/hls/part-4-1.mp4',
        byteRange: [0, 718],
      });
      expect(details.dateRanges)
        .to.have.property('drMeta')
        .which.has.property('attr')
        .which.deep.includes({
          ID: 'drMeta',
          'START-DATE': '2018-09-28T16:50:48Z',
          'END-DATE': '2018-09-28T16:50:48Z',
          'X-CUSTOM': 'ok!',
          'SCTE35-OUT': '0x20000000',
        });
      expectWithJSONMessage(
        details.fragments[3].levelkeys?.['com.apple.streamingkeydelivery'],
        'levelkeys',
      ).to.deep.include({
        uri: 'skd://key-data',
        method: 'SAMPLE-AES',
        keyFormat: 'com.apple.streamingkeydelivery',
        keyFormatVersions: [1, 2],
        iv: new Uint8Array([0, 0, 0, 2]),
        key: null,
        keyId: null,
      });
      expect(details.preloadHint).to.deep.include({
        TYPE: 'PART',
        URI: 'part-5.1.mp4',
      });
      if (details.partList === null) {
        expect(details.partList, 'partList').to.not.equal(null);
        return;
      }
      if (!details.renditionReports) {
        expect(details.renditionReports, 'renditionReports').to.not.be
          .undefined;
        return;
      }
      expect(details.renditionReports[0]).to.deep.include({
        URI: '/media0/ok.m3u8',
        'LAST-MSN': '4',
        'LAST-PART': '3',
      });
      expect(details.renditionReports[1]).to.deep.include({
        URI: '/media2/ok.m3u8',
      });
    });

    it('defines variables using QUERYPARAM name/value pairs in parent Playlist URIs and substites variable references', function () {
      const manifest = `#EXTM3U
#EXT-X-DEFINE:QUERYPARAM="token"
#EXT-X-DEFINE:QUERYPARAM="foo"
#EXT-X-SESSION-DATA:DATA-ID="var-applied",VALUE="{$foo}"
#EXT-X-STREAM-INF:BANDWIDTH=836280,RESOLUTION=848x360
https://www.x.com/sec/video/1.m3u8?parent-token={$token}
#EXT-X-STREAM-INF:BANDWIDTH=1836280,RESOLUTION=848x360
https://www.x.com/sec/video/2.m3u8?parent-token={$token}`;

      const result = M3U8Parser.parseMasterPlaylist(
        manifest,
        'https://www.x.com?foo=bar&a=ok&token=1234',
      );

      if (result.variableList === null) {
        expect(result.variableList, 'variableList').to.not.equal(null);
        return;
      }
      expect(result.variableList.foo).to.equal('bar');
      expect(result.variableList.token).to.equal('1234');
      expect(result.variableList).to.not.have.property('a');

      if (result.sessionData === null) {
        expect(result.sessionData, 'sessionData').to.not.equal(null);
        return;
      }
      expect(result.sessionData['var-applied'].VALUE).to.equal('bar');
      expect(result.levels[0]).to.deep.include(
        {
          url: 'https://www.x.com/sec/video/1.m3u8?parent-token=1234',
        },
        JSON.stringify(result.levels[0], null, 2),
      );
      expect(result.levels[1]).to.deep.include(
        {
          url: 'https://www.x.com/sec/video/2.m3u8?parent-token=1234',
        },
        JSON.stringify(result.levels[0], null, 2),
      );
      const level = `#EXTM3U
#EXT-X-VERSION:1
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-TARGETDURATION:5
#EXT-X-DEFINE:IMPORT="token"
#EXT-X-DEFINE:QUERYPARAM="parent-token"
#EXT-X-DEFINE:NAME="extra",VALUE="yes"
#EXTINF:4
segment-1.mp4?pt={$parent-token}&t={$token}&x={$extra}
#EXTINF:4
segment-2.mp4?t={$token}
#EXTINF:4
segment-3.mp4?t={$token}`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'https://www.x.com/sec/video/1.m3u8?parent-token=1234',
        0,
        PlaylistLevelType.MAIN,
        0,
        result.variableList,
      );
      expect(details.playlistParsingError).to.be.null;
      if (details.variableList === null) {
        expect(details.variableList, 'variableList').to.not.equal(null);
        return;
      }
      expect(details.variableList.token).to.equal('1234');
      expect(details.variableList['parent-token']).to.equal('1234');
      expect(details.variableList).to.not.have.property('foo');
      expect(details.fragments).to.have.lengthOf(3);
      expect(details.fragments[0]).to.deep.include({
        relurl: 'segment-1.mp4?pt=1234&t=1234&x=yes',
        url: 'https://www.x.com/sec/video/segment-1.mp4?pt=1234&t=1234&x=yes',
      });
      expect(details.fragments[1]).to.deep.include({
        relurl: 'segment-2.mp4?t=1234',
        url: 'https://www.x.com/sec/video/segment-2.mp4?t=1234',
      });
      expect(details.fragments[2]).to.deep.include({
        relurl: 'segment-3.mp4?t=1234',
        url: 'https://www.x.com/sec/video/segment-3.mp4?t=1234',
      });
    });

    it('fails to parse Media Playlist when IMPORT variable is not present', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:1
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-TARGETDURATION:5
#EXT-X-DEFINE:IMPORT="mvpVar"
#EXTINF:4
a{$mvpVar}.mp4
#EXTINF:4
2.mp4
#EXTINF:4
3.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.variableList).to.equal(null);
      expectPlaylistParsingError(
        details,
        'EXT-X-DEFINE IMPORT attribute not found in Multivariant Playlist: "mvpVar"',
      );
      expect(details.fragments[0].relurl).to.equal('a{$mvpVar}.mp4');
    });

    it('fails to parse Media Playlist when variable reference has no definition', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:1
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-TARGETDURATION:5
#EXTINF:4
a{$bar}.mp4
#EXTINF:4
2.mp4
#EXTINF:4
3.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.variableList, 'variableList').to.equal(null);
      expectPlaylistParsingError(
        details,
        'Missing preceding EXT-X-DEFINE tag for Variable Reference: "bar"',
      );
      expect(details.fragments?.[0].relurl).to.equal('a{$bar}.mp4');
    });

    it('fails to parse Media Playlist when variable reference precedes definition', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:1
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-TARGETDURATION:5
#EXTINF:4
a{$bar}.mp4
#EXT-X-DEFINE:NAME="bar",VALUE="1"
#EXTINF:4
2.mp4
#EXTINF:4
3.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expect(details.variableList, 'variableList').to.deep.equal({ bar: '1' });
      expectPlaylistParsingError(
        details,
        'Missing preceding EXT-X-DEFINE tag for Variable Reference: "bar"',
      );
      expect(details.fragments[0].relurl).to.equal('a{$bar}.mp4');
    });
  });

  describe('Media Playlist Tag single occurance validation', function () {
    it('#EXT-X-TARGETDURATION must not appear more than once', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:5
#EXT-X-TARGETDURATION:4
#EXTINF:4
1.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expectPlaylistParsingError(
        details,
        '#EXT-X-TARGETDURATION must not appear more than once (#EXT-X-TARGETDURATION:4)',
      );
    });

    it('#EXT-X-ENDLIST must not appear more than once', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:5
#EXTINF:4
1.mp4
#EXT-X-ENDLIST
#EXT-X-ENDLIST`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expectPlaylistParsingError(
        details,
        '#EXT-X-ENDLIST must not appear more than once (#EXT-X-ENDLIST)',
      );
    });

    it('#EXT-X-DISCONTINUITY-SEQUENCE must not appear more than once', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:5
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-DISCONTINUITY-SEQUENCE:2
#EXTINF:4
1.mp4
#EXT-X-DISCONTINUITY-SEQUENCE:3
#EXTINF:4
2.mp4
#EXTINF:4
3.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expectPlaylistParsingError(
        details,
        '#EXT-X-DISCONTINUITY-SEQUENCE must not appear more than once (#EXT-X-DISCONTINUITY-SEQUENCE:3)',
      );
    });

    it('#EXT-X-MEDIA-SEQUENCE must not appear more than once', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:5
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:4
1.mp4
#EXT-X-MEDIA-SEQUENCE:2
#EXTINF:4
2.mp4
#EXTINF:4
3.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expectPlaylistParsingError(
        details,
        '#EXT-X-MEDIA-SEQUENCE must not appear more than once (#EXT-X-MEDIA-SEQUENCE:2)',
      );
    });

    it('#EXT-X-PLAYLIST-TYPE must not appear more than once', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:5
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-PLAYLIST-TYPE:EVENT
#EXTINF:4
1.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expectPlaylistParsingError(
        details,
        '#EXT-X-PLAYLIST-TYPE must not appear more than once (#EXT-X-PLAYLIST-TYPE:EVENT)',
      );
    });

    it('#EXT-X-PART-INF must not appear more than once', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:5
#EXT-X-PART-INF:PART-TARGET=1.000
#EXT-X-PART-INF:PART-TARGET=0.500
#EXTINF:4
1.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expectPlaylistParsingError(
        details,
        '#EXT-X-PART-INF must not appear more than once (#EXT-X-PART-INF:PART-TARGET=0.500)',
      );
    });

    it('#EXT-X-SERVER-CONTROL must not appear more than once', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:5
#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES,PART-HOLD-BACK=3.0
#EXT-X-SERVER-CONTROL:CAN-SKIP-UNTIL=24
#EXTINF:4
1.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expectPlaylistParsingError(
        details,
        '#EXT-X-SERVER-CONTROL must not appear more than once (#EXT-X-SERVER-CONTROL:CAN-SKIP-UNTIL=24)',
      );
    });

    // #EXT-X-SKIP is a Media Metadata Tag, not a Media Playlist Tag, but the same "only one" rule applies
    it('#EXT-X-SKIP must not appear more than once', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:5
#EXT-X-MEDIA-SEQUENCE:1
#EXT-X-SKIP:SKIPPED-SEGMENTS=1
#EXTINF:4
2.mp4
#EXT-X-SKIP:SKIPPED-SEGMENTS=3
#EXTINF:4
6.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expectPlaylistParsingError(
        details,
        '#EXT-X-SKIP must not appear more than once (#EXT-X-SKIP:SKIPPED-SEGMENTS=3)',
      );
    });

    // #EXT-X-VERSION is allowed in Media Playlists and Multivariant Playlists, but the same "only one" rule applies
    it('#EXT-X-VERSION must not appear more than once', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:5
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:5
#EXTINF:4
2.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expectPlaylistParsingError(
        details,
        '#EXT-X-VERSION must not appear more than once (#EXT-X-VERSION:6)',
      );
    });
  });

  describe('Media Playlist sequence tag validation', function () {
    it('#EXT-X-DISCONTINUITY-SEQUENCE must appear before the first Media Segment', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:5
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:4
1.mp4
#EXT-X-DISCONTINUITY-SEQUENCE:3
#EXTINF:4
2.mp4
#EXTINF:4
3.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expectPlaylistParsingError(
        details,
        '#EXT-X-DISCONTINUITY-SEQUENCE must appear before the first Media Segment (#EXT-X-DISCONTINUITY-SEQUENCE:3)',
      );
    });

    it('#EXT-X-MEDIA-SEQUENCE must appear before the first Media Segment', function () {
      const level = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:5
#EXTINF:4
1.mp4
#EXT-X-MEDIA-SEQUENCE:2
#EXTINF:4
2.mp4
#EXTINF:4
3.mp4`;
      const details = M3U8Parser.parseLevelPlaylist(
        level,
        'http://example.com/hls/index.m3u8',
        0,
        PlaylistLevelType.MAIN,
        0,
        null,
      );
      expectPlaylistParsingError(
        details,
        '#EXT-X-MEDIA-SEQUENCE must appear before the first Media Segment (#EXT-X-MEDIA-SEQUENCE:2)',
      );
    });
  });
});

function expectWithJSONMessage(value: any, msg?: string) {
  return expect(value, `${msg || 'actual:'} ${JSON.stringify(value, null, 2)}`);
}

function expectPlaylistParsingError(object: any, message: string) {
  expect(
    object,
    object?.playlistParsingError ? undefined : 'playlistParsingError',
  )
    .to.have.property('playlistParsingError')
    .which.is.an('Error')
    .which.has.property('message')
    .which.equals(message);
}
