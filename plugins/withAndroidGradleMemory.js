const { AndroidConfig, withGradleProperties } = require('expo/config-plugins');

const { updateAndroidBuildProperty } = AndroidConfig.BuildProperties;

const GRADLE_JVM_ARGS =
  '-Xmx6g -XX:MaxMetaspaceSize=2g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8';
const KOTLIN_DAEMON_JVM_OPTIONS = '-Xmx2g';

function withAndroidGradleMemory(config) {
  return withGradleProperties(config, (config) => {
    // Building React Native from source triggers dependency lint in release builds.
    // The default JVM/metaspace settings are too small for local production builds.
    updateAndroidBuildProperty(config.modResults, 'org.gradle.jvmargs', GRADLE_JVM_ARGS);
    updateAndroidBuildProperty(
      config.modResults,
      'kotlin.daemon.jvm.options',
      KOTLIN_DAEMON_JVM_OPTIONS,
    );
    return config;
  });
}

module.exports = withAndroidGradleMemory;
