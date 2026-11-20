import Foundation
import Speech
import AVFoundation

func emit(_ value: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: value), let line = String(data: data, encoding: .utf8) else { return }
    print(line)
    fflush(stdout)
}

final class Dictation {
    let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "zh-CN"))
    let engine = AVAudioEngine()
    var request: SFSpeechAudioBufferRecognitionRequest?
    var task: SFSpeechRecognitionTask?
    var timer: Timer?
    var installed = false
    var generation = 0
    var active = false

    func stop() {
        generation += 1
        active = false
        timer?.invalidate(); timer = nil
        engine.stop()
        if installed { engine.inputNode.removeTap(onBus: 0); installed = false }
        request?.endAudio(); task?.cancel()
        request = nil; task = nil
    }
    func start() {
        stop()
        active = true
        let token = generation
        SFSpeechRecognizer.requestAuthorization { status in
            DispatchQueue.main.async {
                guard token == self.generation && self.active else { return }
                guard status == .authorized else { self.stop(); emit(["type":"error", "message":"请在系统设置 → 隐私与安全性中允许语音识别。"]); return }
                AVCaptureDevice.requestAccess(for: .audio) { allowed in
                    DispatchQueue.main.async {
                        guard token == self.generation && self.active else { return }
                        guard allowed else { self.stop(); emit(["type":"error", "message":"请在系统设置 → 隐私与安全性中允许麦克风。"]); return }
                        self.begin(token)
                    }
                }
            }
        }
    }
    func begin(_ token: Int) {
        guard let recognizer = recognizer, recognizer.isAvailable else { stop(); emit(["type":"error", "message":"系统语音识别暂不可用，请检查中文语言支持或网络。"]); return }
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        // Prefer local recognition; unsupported devices/languages use Apple's network service.
        request.requiresOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
        self.request = request
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0 && format.channelCount > 0 else { stop(); emit(["type":"error", "message":"找不到可用的麦克风。"]); return }
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
            if let values = buffer.floatChannelData?[0], buffer.frameLength > 0 {
                var power: Float = 0
                for i in 0..<Int(buffer.frameLength) { power += values[i] * values[i] }
                let rms = sqrt(power / Float(buffer.frameLength))
                if rms > 0.012 { DispatchQueue.main.async { if token == self.generation && self.active { emit(["type":"voice"]) } } }
            }
        }
        installed = true
        task = recognizer.recognitionTask(with: request) { result, error in
            DispatchQueue.main.async {
                guard token == self.generation && self.active else { return }
                if let result = result { emit(["type":"transcript", "text":result.bestTranscription.formattedString, "final":result.isFinal]) }
                if error != nil || result?.isFinal == true {
                    let hasText = !(result?.bestTranscription.formattedString.isEmpty ?? true)
                    self.stop()
                    if error != nil {
                        emit(["type":"error", "message":"系统语音识别中断，请检查麦克风或网络后重新开启语音。"])
                    } else {
                        emit(["type":"ended", "hasText":hasText])
                    }
                }
            }
        }
        do { engine.prepare(); try engine.start(); emit(["type":"ready", "onDevice":request.requiresOnDeviceRecognition]) }
        catch { stop(); emit(["type":"error", "message":"无法开启麦克风，请检查设备和授权。"]) }
        timer = Timer.scheduledTimer(withTimeInterval: 50, repeats: false) { _ in
            guard token == self.generation else { return }
            self.stop(); emit(["type":"ended"])
        }
    }
}
let dictation = Dictation()
DispatchQueue.global().async {
    while let line = readLine() {
        guard let data = line.data(using: .utf8), let command = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { continue }
        DispatchQueue.main.async {
            if command["type"] as? String == "start" { dictation.start() }
            else { dictation.stop() }
        }
    }
    exit(0)
}
RunLoop.main.run()
