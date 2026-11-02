package com.sora.audio

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.sora.audio.plugin.SoraPlayerPlugin
import com.sora.audio.updater.AppUpdaterPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(SoraPlayerPlugin::class.java)
        registerPlugin(AppUpdaterPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
