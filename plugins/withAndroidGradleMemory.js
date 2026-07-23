const { AndroidConfig, withGradleProperties } = require('expo/config-plugins');

const { updateAndroidBuildProperty } = AndroidConfig.BuildProperties;

const GRADLE_JVM_ARGS =
  '-Xmx6g -XX:MaxMetaspaceSize=2g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8';
const KOTLIN_DAEMON_JVM_OPTIONS = '-Xmx2g';

function withAndroidGradleMemory(config) {
  return withGradleProperties(config, (gradleConfig) => {
    // Building React Native from source triggers dependency lint in release builds.
    // The default JVM/metaspace settings are too small for local production builds.
    updateAndroidBuildProperty(gradleConfig.modResults, 'org.gradle.jvmargs', GRADLE_JVM_ARGS);
    updateAndroidBuildProperty(
      gradleConfig.modResults,
      'kotlin.daemon.jvm.options',
      KOTLIN_DAEMON_JVM_OPTIONS,
    );
    return gradleConfig;
  });
}

module.exports = withAndroidGradleMemory;
