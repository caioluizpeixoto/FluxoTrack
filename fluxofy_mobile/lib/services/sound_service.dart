import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';

class SoundService {
  static final AudioPlayer _player = AudioPlayer();

  // Toca o som de notificação único de venda (venda.mp3)
  static Future<String?> playSaleNotificationSound() async {
    try {
      await _player.stop();
      await _player.setVolume(1.0);

      try {
        await _player.play(AssetSource('sounds/venda.mp3'));
        return null;
      } catch (e1) {
        try {
          await _player.play(AssetSource('venda.mp3'));
          return null;
        } catch (e2) {
          await SystemSound.play(SystemSoundType.click);
          return null;
        }
      }
    } catch (err) {
      if (err.toString().contains('MissingPluginException')) {
        await SystemSound.play(SystemSoundType.click);
        return 'O aplicativo precisa ser reiniciado completamente para compilar o plugin de áudio nativo. Pare o flutter run no terminal e execute "flutter run" novamente.';
      }
      return err.toString();
    }
  }

  static Future<String?> playApprovedSaleSound() async {
    return await playSaleNotificationSound();
  }

  static Future<String?> playPendingSaleSound() async {
    return await playSaleNotificationSound();
  }
}
