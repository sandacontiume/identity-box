import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button, View, StyleSheet } from 'react-native'
import * as Permissions from 'expo-permissions'
import { BarCodeScanner } from 'expo-barcode-scanner'
// import styled from '@emotion/native'

import { useIdentity } from 'src/identity'
import { useTelepath } from 'src/telepath'

import {
  PageContainer,
  Container,
  Description,
  Welcome
} from 'src/views/identity/ui'

const CurrentIdentity = ({ navigation }) => {
  const [identity, setIdentity] = useState({ name: '', did: '' })
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [channelDescription, setChannelDescription] = useState({})
  const telepathProvider = useRef(undefined)

  const enableCamera = async () => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA)
    setCameraEnabled(status === 'granted')
  }

  const confirmQRCodeScanned = async telepathProvider => {
    const message = {
      jsonrpc: '2.0',
      method: 'connectionSetupDone',
      params: []
    }
    try {
      await telepathProvider.emit(message)
    } catch (e) {
      console.log(e.message)
    }
  }

  useIdentity({
    onReady: identityManager => {
      setIdentity(identityManager.getCurrent())
    }
  })

  telepathProvider.current = useTelepath({
    name: channelDescription.appName,
    channelDescription,
    onMessage: message => {
      console.log('received message: ', message)
    },
    onError: error => {
      console.log('error: ', error)
    },
    onTelepathReady: ({ telepathProvider }) => {
      console.log('telepath ready')
      confirmQRCodeScanned(telepathProvider)
    }
  }, [channelDescription])

  useEffect(() => {
    enableCamera()
  }, [])

  const addNewIdentity = ({ did }) => {
    // let identity
    // if (section.title === 'Your identities') {
    //   const id = identities[item]
    //   identity = { name: id.name, did: id.did }
    // } else {
    //   identity = { name: item, did: peerIdentities[item] }
    // }
    navigation.navigate('AddNewIdentity', { did })
  }

  const scanQRCode = useCallback(async () => {
    console.log('scan QR code')
    setScanning(true)
  }, [])

  const getChannelDescription = connectUrl => {
    const match = connectUrl.match(/#I=(?<id>.*)&E=(?<key>.*)&A=(?<appName>.*)/)

    return match && match.groups
  }

  const handleBarCodeScanned = useCallback(({ type, data }) => {
    console.log(`Code scanned. Type: ${type}, data: ${data}`)
    setScanning(false)
    if (data.match(/^did:ipid:.{46}$/)) {
      console.log(`Detected DID: ${data}`)
      addNewIdentity({ did: data })
    } else {
      const channelDescription = getChannelDescription(data)
      if (channelDescription) {
        console.log('channelDescription:', channelDescription)
        setChannelDescription(channelDescription)
      }
    }
  })

  return (
    <PageContainer>
      <Container>
        <Welcome>{identity.name}</Welcome>
        <Description style={{
          flexGrow: 1
        }}>
          {identity.did}
        </Description>
        { scanning && <View style={{
          width: 200,
          height: 200
        }}>
          <BarCodeScanner
            onBarCodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        </View>}
        <Button
          title='Scan...'
          color='#FF6699'
          disabled={!cameraEnabled || scanning}
          accessibilityLabel='Scan QR-Code'
          onPress={scanQRCode}
        />
      </Container>
    </PageContainer>
  )
}

CurrentIdentity.navigationOptions = {
  tabBarLabel: 'Identity'
}

export { CurrentIdentity }
