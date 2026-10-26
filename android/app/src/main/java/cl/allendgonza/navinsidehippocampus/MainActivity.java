package cl.allendgonza.navinsidehippocampus;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NavInsideSpeechRecognitionPlugin.class);
        registerPlugin(NavInsideTextToSpeechPlugin.class);
        super.onCreate(savedInstanceState);
    }
}