import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Inicializar Firebase
    FirebaseApp.configure()
    
    // Configurar notificaciones
    UNUserNotificationCenter.current().delegate = self
    Messaging.messaging().delegate = self
    
    let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
    UNUserNotificationCenter.current().requestAuthorization(
      options: authOptions,
      completionHandler: { _, _ in }
    )
    
    application.registerForRemoteNotifications()
    
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "frontend",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
  
  // Manejar token de notificaciones
  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
  }
  
  // Delegate de Firebase Messaging
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    if let token = fcmToken {
      print("FCM Token: \(token)")
    }
  }
  
  // Manejar notificaciones en foreground
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                             willPresent notification: UNNotification,
                             withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([[.banner, .sound, .badge]])
  }
  
  // Manejar tap en notificación
  func userNotificationCenter(_ center: UNUserNotificationCenter,
                             didReceive response: UNNotificationResponse,
                             withCompletionHandler completionHandler: @escaping () -> Void) {
    completionHandler()
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
