import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './ThemedText';

interface TeamTextProps {
  initialTeamName: string;
  color: string;
}

export default function TeamText({ initialTeamName, color }: TeamTextProps) {
  const [teamName, setTeamName] = useState<string>(initialTeamName);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  return (
    <>
      {/* <Pressable onPress={() => setModalVisible(true)}> */}
      <View style={styles.teamText}>
        <ThemedText style={{ color: color }} type="title">
          {teamName}
        </ThemedText>
      </View>
      {/* </Pressable>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert('Modal has been closed.');
          setModalVisible(!modalVisible);
        }}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text>Hello World!</Text>
            <Pressable style={[styles.buttonClose]} onPress={() => setModalVisible(!modalVisible)}>
              <Text>Hide Modal</Text>
            </Pressable>
          </View>
        </View>
      </Modal> */}
    </>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamText: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
});
